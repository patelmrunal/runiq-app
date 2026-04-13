const {setGlobalOptions} = require("firebase-functions");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

if (!admin.apps.length) {
	admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

setGlobalOptions({maxInstances: 10});

const FORCE_SCHEDULE_WINDOWS = process.env.FUNCTIONS_EMULATOR === "true" && process.env.PHASE3_FORCE_SCHEDULE === "1";

const LEVEL_THRESHOLDS = [
	{level: 7, minStreak: 60},
	{level: 6, minStreak: 50},
	{level: 5, minStreak: 45},
	{level: 4, minStreak: 30},
	{level: 3, minStreak: 15},
	{level: 2, minStreak: 5},
	{level: 1, minStreak: 0},
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FREE_RUN_STREAK_MIN_KM = 1.4;
const SHIELD_AUTO_APPLY_MAX_STREAK = 5;
const TASK_COMPLETION_DISTANCE_EPSILON_KM = 0.005;
const TASK_COMPLETION_PACE_EPSILON_MIN_PER_KM = 0.02;

const DAY_FORMATTERS = new Map();

const toNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDifficulty = (value) => {
	const raw = typeof value === "string" ? value.trim().toLowerCase() : "easy";
	if (raw === "hard") return "Hard";
	if (raw === "medium") return "Medium";
	if (raw === "bonus") return "Bonus";
	return "Easy";
};

const toTitleCaseDifficulty = (value) => {
	const normalized = normalizeDifficulty(value);
	if (normalized === "Bonus") return "Hard";
	return normalized;
};

const getFormatter = (timeZone) => {
	const key = typeof timeZone === "string" && timeZone ? timeZone : "Asia/Kolkata";
	if (!DAY_FORMATTERS.has(key)) {
		DAY_FORMATTERS.set(
			key,
			new Intl.DateTimeFormat("en-CA", {
				timeZone: key,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
				weekday: "short",
			})
		);
	}
	return DAY_FORMATTERS.get(key);
};

const getLocalDateInfo = (date, timeZone) => {
	const formatter = getFormatter(timeZone);
	const parts = formatter.formatToParts(date);
	const map = {};
	parts.forEach((part) => {
		map[part.type] = part.value;
	});

	const dayKey = `${map.year}-${map.month}-${map.day}`;
	const hour = toNumber(map.hour, 0);
	const minute = toNumber(map.minute, 0);
	const weekdayShort = map.weekday || "Sun";

	return {
		dayKey,
		hour,
		minute,
		weekday: weekdayShortToIndex(weekdayShort),
	};
};

const weekdayShortToIndex = (weekday) => {
	const key = String(weekday).slice(0, 3).toLowerCase();
	const map = {
		sun: 0,
		mon: 1,
		tue: 2,
		wed: 3,
		thu: 4,
		fri: 5,
		sat: 6,
	};
	return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : 0;
};

const isInLocalWindow = (date, timeZone, targetHour, targetMinute, windowMinutes = 15) => {
	const info = getLocalDateInfo(date, timeZone);
	const current = info.hour * 60 + info.minute;
	const target = targetHour * 60 + targetMinute;
	return current >= target && current < target + windowMinutes;
};

const parseDayKey = (dayKey) => {
	const [year, month, day] = String(dayKey).split("-").map((v) => Number(v));
	return new Date(Date.UTC(year, month - 1, day));
};

const shiftDayKey = (dayKey, delta) => {
	if (!dayKey) return "";
	const base = parseDayKey(dayKey);
	const shifted = new Date(base.getTime() + delta * ONE_DAY_MS);
	const yyyy = shifted.getUTCFullYear();
	const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(shifted.getUTCDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
};

const dayDiff = (fromDayKey, toDayKey) => {
	if (!fromDayKey || !toDayKey) return Number.NaN;
	const from = parseDayKey(fromDayKey).getTime();
	const to = parseDayKey(toDayKey).getTime();
	return Math.round((to - from) / ONE_DAY_MS);
};

const normalizeDayKey = (value, timeZone) => {
	if (!value) return "";
	if (typeof value === "string") {
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) {
			return getLocalDateInfo(parsed, timeZone).dayKey;
		}
		return "";
	}
	if (value && typeof value.toDate === "function") {
		return getLocalDateInfo(value.toDate(), timeZone).dayKey;
	}
	if (value instanceof Date) {
		return getLocalDateInfo(value, timeZone).dayKey;
	}
	return "";
};

const calculateLevel = (streak) => {
	const safe = Math.max(0, toNumber(streak, 0));
	const matched = LEVEL_THRESHOLDS.find((entry) => safe >= entry.minStreak);
	return matched ? matched.level : 1;
};

const toStringData = (payload = {}) => {
	const out = {};
	Object.keys(payload).forEach((key) => {
		const raw = payload[key];
		if (raw === undefined || raw === null) return;
		out[key] = String(raw);
	});
	return out;
};

const sendPushToUser = async (userRef, notification, data = {}) => {
	const tokenSnap = await userRef.collection("devices").where("isActive", "==", true).get();
	const tokenEntries = tokenSnap.docs
		.map((docSnap) => {
			const payload = docSnap.data() || {};
			return {
				ref: docSnap.ref,
				token: typeof payload.token === "string" ? payload.token : "",
			};
		})
		.filter((entry) => entry.token.length > 0);

	const tokens = tokenEntries.map((entry) => entry.token);

	if (tokens.length === 0) {
		return {successCount: 0, failureCount: 0};
	}

	const result = await messaging.sendEachForMulticast({
		tokens,
		notification,
		data: toStringData(data),
	});

	const staleTokens = [];
	result.responses.forEach((response, index) => {
		if (!response.success) {
			const code = response.error?.code || "";
			if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
				staleTokens.push(tokens[index]);
			}
		}
	});

	if (staleTokens.length > 0) {
		const batch = db.batch();
		tokenEntries.forEach((entry) => {
			if (staleTokens.includes(entry.token)) {
				batch.set(
					entry.ref,
					{
						isActive: false,
						lastErrorAt: FieldValue.serverTimestamp(),
					},
					{merge: true}
				);
			}
		});
		await batch.commit();
	}

	return {
		successCount: result.successCount,
		failureCount: result.failureCount,
	};
};

const pickRandom = (items) => {
	if (!Array.isArray(items) || items.length === 0) return null;
	const index = Math.floor(Math.random() * items.length);
	return items[index];
};

const pickTaskByDifficulty = (pool, difficulty, recentTaskIds, usedTaskIds) => {
	const byDiff = pool.filter((task) => task.difficulty === difficulty && !usedTaskIds.has(task.taskId));
	if (byDiff.length === 0) return null;

	const fresh = byDiff.filter((task) => !recentTaskIds.has(task.taskId));
	const picked = pickRandom(fresh.length > 0 ? fresh : byDiff);
	return picked || null;
};

const loadTaskTemplates = async (userLevel) => {
	const snapshot = await db.collection("auto").get();
	const templates = [];

	snapshot.docs.forEach((docSnap) => {
		const data = docSnap.data() || {};
		const levelRequired = Math.max(1, toNumber(data.levelRequired, 1));
		const isActive = data.isActive !== false;

		if (!isActive) return;
		if (levelRequired > userLevel) return;

		templates.push({
			taskId: docSnap.id,
			title: typeof data.title === "string" ? data.title : docSnap.id,
			description: typeof data.description === "string" ? data.description : "",
			difficulty: toTitleCaseDifficulty(data.difficulty),
			targetKm: Math.max(0, toNumber(data.targetKm, 0)),
			targetMinutes: Math.max(0, toNumber(data.targetMinutes ?? data.targetMin, 0)),
			levelRequired,
		});
	});

	return templates;
};

const loadRecentTaskIds = async (userRef) => {
	const recentSnap = await userRef
		.collection("runLog")
		.orderBy("createdAt", "desc")
		.limit(30)
		.get();

	const recentTaskIds = new Set();
	recentSnap.docs.forEach((docSnap) => {
		const data = docSnap.data() || {};
		if (typeof data.taskId === "string" && data.taskId && data.taskId !== "free_run") {
			recentTaskIds.add(data.taskId);
		}
	});

	return recentTaskIds;
};

const assignDailyTasksForUser = async (userRef, userData, dayKey) => {
	const level = Math.max(1, toNumber(userData.level, 1));
	const tier = typeof userData.tier === "string" ? userData.tier : "basic";
	const templates = await loadTaskTemplates(level);

	if (templates.length === 0) {
		logger.warn("No active task templates available", {uid: userRef.id, dayKey});
		return 0;
	}

	const recentTaskIds = await loadRecentTaskIds(userRef);
	const usedTaskIds = new Set();
	const selected = [];

	["Easy", "Medium", "Hard"].forEach((difficulty) => {
		const picked = pickTaskByDifficulty(templates, difficulty, recentTaskIds, usedTaskIds);
		if (picked) {
			selected.push(picked);
			usedTaskIds.add(picked.taskId);
		}
	});

	while (selected.length < 3) {
		const fallbackPool = templates.filter((task) => !usedTaskIds.has(task.taskId));
		if (fallbackPool.length === 0) break;
		const picked = pickRandom(fallbackPool);
		if (!picked) break;
		selected.push(picked);
		usedTaskIds.add(picked.taskId);
	}

	if (tier === "premium") {
		const bonusPool = templates.filter((task) => task.difficulty === "Hard" && !usedTaskIds.has(task.taskId));
		const bonus = pickRandom(bonusPool);
		if (bonus) {
			selected.push({...bonus, difficulty: "Hard", isBonus: true});
			usedTaskIds.add(bonus.taskId);
		}
	}

	const dailyTasksRef = userRef.collection("dailyTasks");
	const existingSnap = await dailyTasksRef.get();
	const batch = db.batch();

	existingSnap.docs.forEach((docSnap) => {
		batch.delete(docSnap.ref);
	});

	selected.forEach((task, index) => {
		const docId = task.isBonus ? `${task.taskId}_bonus` : task.taskId;
		batch.set(dailyTasksRef.doc(docId), {
			taskId: task.taskId,
			title: task.title,
			description: task.description,
			difficulty: task.difficulty,
			targetKm: task.targetKm,
			targetMinutes: task.targetMinutes,
			levelRequired: task.levelRequired,
			isActive: true,
			dayKey,
			status: "pending",
			isCompleted: false,
			isBonus: Boolean(task.isBonus),
			position: index,
			assignedAt: FieldValue.serverTimestamp(),
		});
	});

	batch.update(userRef, {
		lastTaskGenerationDate: dayKey,
		lastTaskGenerationAt: FieldValue.serverTimestamp(),
	});

	await batch.commit();
	return selected.length;
};

const writeEvent = async (userRef, type, payload = {}) => {
	await userRef.collection("events").add({
		type,
		payload,
		seen: false,
		createdAt: FieldValue.serverTimestamp(),
	});
};

exports.onRunLogCreated = onDocumentCreated(
	{
		document: "users/{uid}/runLog/{runId}",
		region: "asia-south1",
	},
	async (event) => {
	const runData = event.data?.data();
	const uid = event.params.uid;
	const runId = event.params.runId;

	if (!runData || !uid || !runId) {
		return;
	}

	const userRef = db.collection("users").doc(uid);
	const runRef = db.collection("users").doc(uid).collection("runLog").doc(runId);

	if (runData.status && runData.status !== "pending") {
		return;
	}

	const distanceKm = toNumber(runData.distance, 0);
	const durationSeconds = toNumber(runData.duration, 0);
	const taskId = typeof runData.taskId === "string" ? runData.taskId : "";
	const isFreeRun = taskId === "free_run";
	const taskTargetKm = Math.max(0, toNumber(runData.taskTargetKm ?? runData.targetKm, 0));
	const taskTargetMinutes = Math.max(0, toNumber(runData.taskTargetMinutes ?? runData.targetMinutes ?? runData.targetMin, 0));
	const pointCount = toNumber(runData.routePointCount, 0);
	const expectedPoints = distanceKm * 10;
	const runMinutes = Math.max(0, durationSeconds / 60);
	const avgPaceMinPerKm = distanceKm > 0 ? runMinutes / distanceKm : Number.POSITIVE_INFINITY;
	const hasDistanceGoal = !isFreeRun && taskTargetKm > 0;
	const hasPaceGoal = hasDistanceGoal && taskTargetMinutes > 0;
	const targetPaceMinPerKm = hasPaceGoal ? taskTargetMinutes / taskTargetKm : null;
	const taskDistanceQualified = hasDistanceGoal
		? distanceKm + TASK_COMPLETION_DISTANCE_EPSILON_KM >= taskTargetKm
		: true;
	const taskPaceQualified = hasPaceGoal
		? avgPaceMinPerKm <= targetPaceMinPerKm + TASK_COMPLETION_PACE_EPSILON_MIN_PER_KM
		: true;
	const taskCompleted = isFreeRun ? true : taskDistanceQualified && taskPaceQualified;
	const taskResult = isFreeRun ? "free_run" : taskCompleted ? "completed" : "failed";
	const taskProgressPct = hasDistanceGoal && taskTargetKm > 0
		? Math.min(100, Math.round((distanceKm / taskTargetKm) * 100))
		: 100;
	const taskFailureReason = !isFreeRun && !taskCompleted
		? !taskDistanceQualified
			? "distance_below_target"
			: "pace_slower_than_required"
		: null;

	let hardFlagReason = "";
	let softFlagReason = null;
	if (distanceKm <= 0 || durationSeconds <= 0) {
		hardFlagReason = "invalid_run_payload";
	} else if (avgPaceMinPerKm < 2.5) {
		hardFlagReason = "impossible_pace";
	} else if (expectedPoints > 0 && pointCount > 0 && pointCount < expectedPoints * 0.35) {
		softFlagReason = "sparse_gps";
	}

	if (hardFlagReason) {
		await runRef.set(
			{
				status: "flagged",
				processedAt: FieldValue.serverTimestamp(),
				flagReason: hardFlagReason,
			},
			{merge: true}
		);

		await db.collection("adminQueue").doc("flaggedRuns").collection("items").doc(runId).set({
			runId,
			userId: uid,
			flaggedAt: FieldValue.serverTimestamp(),
			flagReason: hardFlagReason,
			avgPace: Number.isFinite(avgPaceMinPerKm) ? avgPaceMinPerKm : null,
			distance: distanceKm,
			reviewStatus: "pending",
		});

		logger.warn("Run flagged", {uid, runId, flagReason: hardFlagReason});
		return;
	}

	if (softFlagReason) {
		await db.collection("adminQueue").doc("flaggedRuns").collection("items").doc(runId).set(
			{
				runId,
				userId: uid,
				flaggedAt: FieldValue.serverTimestamp(),
				flagReason: softFlagReason,
				avgPace: Number.isFinite(avgPaceMinPerKm) ? avgPaceMinPerKm : null,
				distance: distanceKm,
				reviewStatus: "warning",
			},
			{merge: true}
		);
	}

	let leveledUpTo = null;

	await db.runTransaction(async (tx) => {
		const userSnap = await tx.get(userRef);
		if (!userSnap.exists) {
			tx.set(
				runRef,
				{
					status: "flagged",
					processedAt: FieldValue.serverTimestamp(),
					flagReason: "user_not_found",
				},
				{merge: true}
			);
			return;
		}

		const user = userSnap.data() || {};
		const timeZone = typeof user.homeTimezone === "string" && user.homeTimezone ? user.homeTimezone : "Asia/Kolkata";
		const runTime =
			(runData.endTime && typeof runData.endTime.toDate === "function" && runData.endTime.toDate()) ||
			(runData.createdAt && typeof runData.createdAt.toDate === "function" && runData.createdAt.toDate()) ||
			new Date();
		const runDayKey = getLocalDateInfo(runTime, timeZone).dayKey;

		const previousStreak = Math.max(0, toNumber(user.currentStreak, 0));
		const previousLevel = Math.max(1, toNumber(user.level, 1));
		const previousLongest = Math.max(previousStreak, toNumber(user.longestStreak, 0));
		const lastRunDay = normalizeDayKey(user.lastRunDate, timeZone);
		const streakEligibleRun = isFreeRun
			? distanceKm >= FREE_RUN_STREAK_MIN_KM
			: taskCompleted;
		const alreadyCreditedToday = streakEligibleRun && (lastRunDay === runDayKey || user.ranTodayFlag === true);
		const streakCreditSkippedReason = !streakEligibleRun
			? isFreeRun
				? "free_run_below_1_4km"
				: "task_not_completed"
			: alreadyCreditedToday
				? "already_credited_today"
				: null;

		let nextStreak = previousStreak;
		let nextLongest = previousLongest;
		let nextLevel = previousLevel;

		if (streakEligibleRun && !alreadyCreditedToday) {
			const gap = dayDiff(lastRunDay, runDayKey);
			if (gap === 1) {
				nextStreak = previousStreak + 1;
			} else {
				nextStreak = 1;
			}
			nextLongest = Math.max(previousLongest, nextStreak);
			nextLevel = calculateLevel(nextStreak);
			if (nextLevel > previousLevel) {
				leveledUpTo = nextLevel;
			}
		}

		const userUpdates = {
			runCount: FieldValue.increment(1),
			totalKm: FieldValue.increment(distanceKm),
			lastActiveAt: FieldValue.serverTimestamp(),
		};

		if (streakEligibleRun) {
			userUpdates.lastRunDate = runDayKey;
			userUpdates.ranTodayFlag = true;
		}

		if (streakEligibleRun && !alreadyCreditedToday) {
			userUpdates.currentStreak = nextStreak;
			userUpdates.longestStreak = nextLongest;
			userUpdates.level = nextLevel;
			if (nextLevel === 7) {
				userUpdates.daysAsLegend = FieldValue.increment(1);
			}
		}

		tx.update(userRef, userUpdates);

		tx.set(
			runRef,
			{
				status: "valid",
				streakEligible: streakEligibleRun,
				streakCredited: streakEligibleRun && !alreadyCreditedToday,
				streakCreditSkippedReason,
				taskResult,
				taskCompleted,
				taskProgressPct,
				taskDistanceQualified,
				taskPaceQualified,
				taskTargetPaceMinPerKm: targetPaceMinPerKm,
				taskFailureReason,
				processedAt: FieldValue.serverTimestamp(),
				flagReason: softFlagReason,
			},
			{merge: true}
		);

		if (taskId && taskId !== "free_run") {
			const taskRef = userRef.collection("dailyTasks").doc(taskId);
			tx.set(
				taskRef,
				{
					status: taskCompleted ? "completed" : "failed",
					isCompleted: taskCompleted,
					completedAt: taskCompleted ? FieldValue.serverTimestamp() : FieldValue.delete(),
					lastAttemptAt: FieldValue.serverTimestamp(),
					lastAttemptRunId: runId,
					lastResult: taskResult,
				},
				{merge: true}
			);
		}

		if (leveledUpTo !== null) {
			const eventRef = userRef.collection("events").doc();
			tx.set(eventRef, {
				type: "level_up",
				seen: false,
				createdAt: FieldValue.serverTimestamp(),
				payload: {
					level: leveledUpTo,
					runId,
				},
			});
		}
	});

	if (leveledUpTo !== null) {
		await sendPushToUser(
			userRef,
			{
				title: `Level ${leveledUpTo} unlocked`,
				body: "Your streak just unlocked a new level. Keep your momentum going.",
			},
			{
				type: "level_up",
				level: leveledUpTo,
			}
		);
	}
}
);

exports.phase3MidnightCron = onSchedule(
	{
		schedule: "every 15 minutes",
		timeZone: "Etc/UTC",
		region: "asia-south1",
	},
	async () => {
		const now = new Date();
		const usersSnap = await db.collection("users").where("isActive", "!=", false).get();

		let processedUsers = 0;
		let resets = 0;
		let shieldsUsed = 0;
		let monthlyShieldGrants = 0;
		let taskAssignments = 0;

		for (const userDoc of usersSnap.docs) {
			const userRef = userDoc.ref;
			const user = userDoc.data() || {};
			const timeZone = typeof user.homeTimezone === "string" && user.homeTimezone ? user.homeTimezone : "Asia/Kolkata";

			if (!FORCE_SCHEDULE_WINDOWS && !isInLocalWindow(now, timeZone, 0, 0, 15)) {
				continue;
			}

			const todayInfo = getLocalDateInfo(now, timeZone);
			const todayKey = todayInfo.dayKey;
			if (user.lastMidnightEvalDate === todayKey) {
				continue;
			}

			const yesterdayKey = shiftDayKey(todayKey, -1);
			const yesterdayWeekday = weekdayShortToIndex(
				new Intl.DateTimeFormat("en-US", {weekday: "short", timeZone: "UTC"}).format(parseDayKey(yesterdayKey))
			);
			const restDay = toNumber(user.restDay, -1);
			const lastRunDay = normalizeDayKey(user.lastRunDate, timeZone);
			const ranYesterday = lastRunDay === yesterdayKey;

			const updates = {
				ranTodayFlag: false,
				lastMidnightEvalDate: todayKey,
				lastMidnightEvalAt: FieldValue.serverTimestamp(),
			};
			const monthKey = todayKey.slice(0, 7);
			let shieldsAvailable = Math.max(0, toNumber(user.shieldsAvailable, 0));

			if (todayKey.endsWith("-01") && user.lastShieldGrantMonth !== monthKey) {
				shieldsAvailable += 1;
				updates.shieldsAvailable = shieldsAvailable;
				updates.lastShieldGrantMonth = monthKey;
				updates.shieldUsedThisMonth = false;
				monthlyShieldGrants += 1;
			}

			let eventType = "";
			let eventPayload = {};

			if (!ranYesterday && restDay !== yesterdayWeekday) {
				const currentStreak = Math.max(0, toNumber(user.currentStreak, 0));
				if (shieldsAvailable > 0 && currentStreak <= SHIELD_AUTO_APPLY_MAX_STREAK) {
					updates.shieldsAvailable = shieldsAvailable - 1;
					updates.shieldUsedThisMonth = true;
					shieldsUsed += 1;
					eventType = "shield_auto_activated";
					eventPayload = {
						dayKey: yesterdayKey,
						streakAtConsume: currentStreak,
						shieldsLeft: shieldsAvailable - 1,
					};
				} else {
					updates.currentStreak = 0;
					updates.level = 1;
					updates.streakBreaksLast30 = FieldValue.increment(1);
					resets += 1;
					eventType = "streak_reset";
					eventPayload = {
						dayKey: yesterdayKey,
						reason: shieldsAvailable > 0 ? "missed_day_shield_not_eligible" : "missed_day_no_shield",
					};
				}
			}

			await userRef.update(updates);
			processedUsers += 1;

			if (eventType) {
				await writeEvent(userRef, eventType, eventPayload);
			}

			if (user.lastTaskGenerationDate !== todayKey) {
				const count = await assignDailyTasksForUser(userRef, user, todayKey);
				taskAssignments += count;
			}
		}

		logger.info("phase3MidnightCron completed", {
			processedUsers,
			resets,
			shieldsUsed,
			monthlyShieldGrants,
			taskAssignments,
		});
	}
);

exports.phase3TenPmReminderCron = onSchedule(
	{
		schedule: "every 15 minutes",
		timeZone: "Etc/UTC",
		region: "asia-south1",
	},
	async () => {
		const now = new Date();
		const usersSnap = await db.collection("users").where("isActive", "!=", false).get();

		let sent = 0;

		for (const userDoc of usersSnap.docs) {
			const userRef = userDoc.ref;
			const user = userDoc.data() || {};
			const timeZone = typeof user.homeTimezone === "string" && user.homeTimezone ? user.homeTimezone : "Asia/Kolkata";

			if (!FORCE_SCHEDULE_WINDOWS && !isInLocalWindow(now, timeZone, 22, 0, 15)) {
				continue;
			}

			const todayKey = getLocalDateInfo(now, timeZone).dayKey;
			if (user.lastTenPmReminderDate === todayKey) {
				continue;
			}

			const lastRunDay = normalizeDayKey(user.lastRunDate, timeZone);
			const ranToday = lastRunDay === todayKey || user.ranTodayFlag === true;
			if (ranToday) {
				await userRef.update({lastTenPmReminderDate: todayKey});
				continue;
			}

			const streak = Math.max(0, toNumber(user.currentStreak, 0));
			const response = await sendPushToUser(
				userRef,
				{
					title: "Your streak is at risk",
					body: `You have not run today. Protect your ${streak}-day streak tonight.`,
				},
				{
					type: "streak_reminder_10pm",
					dayKey: todayKey,
				}
			);

			await userRef.update({
				lastTenPmReminderDate: todayKey,
				lastTenPmReminderAt: FieldValue.serverTimestamp(),
			});

			if (response.successCount > 0) {
				sent += 1;
			}
		}

		logger.info("phase3TenPmReminderCron completed", {sent});
	}
);

exports.phase3ElevenThirtyReminderCron = onSchedule(
	{
		schedule: "every 15 minutes",
		timeZone: "Etc/UTC",
		region: "asia-south1",
	},
	async () => {
		const now = new Date();
		const usersSnap = await db.collection("users").where("isActive", "!=", false).get();

		let sent = 0;

		for (const userDoc of usersSnap.docs) {
			const userRef = userDoc.ref;
			const user = userDoc.data() || {};
			const timeZone = typeof user.homeTimezone === "string" && user.homeTimezone ? user.homeTimezone : "Asia/Kolkata";

			if (!FORCE_SCHEDULE_WINDOWS && !isInLocalWindow(now, timeZone, 23, 30, 15)) {
				continue;
			}

			const todayKey = getLocalDateInfo(now, timeZone).dayKey;
			if (user.lastElevenThirtyReminderDate === todayKey) {
				continue;
			}

			const lastRunDay = normalizeDayKey(user.lastRunDate, timeZone);
			const ranToday = lastRunDay === todayKey || user.ranTodayFlag === true;
			const shields = Math.max(0, toNumber(user.shieldsAvailable, 0));

			if (ranToday || shields <= 0) {
				await userRef.update({lastElevenThirtyReminderDate: todayKey});
				continue;
			}

			const response = await sendPushToUser(
				userRef,
				{
					title: "Final warning before midnight",
					body: "No run logged today. Your shield will auto-activate at midnight.",
				},
				{
					type: "streak_reminder_1130pm",
					dayKey: todayKey,
				}
			);

			await userRef.update({
				lastElevenThirtyReminderDate: todayKey,
				lastElevenThirtyReminderAt: FieldValue.serverTimestamp(),
			});

			if (response.successCount > 0) {
				sent += 1;
			}
		}

		logger.info("phase3ElevenThirtyReminderCron completed", {sent});
	}
);

exports.phase3DailyTaskBackfillCron = onSchedule(
	{
		schedule: "every 60 minutes",
		timeZone: "Etc/UTC",
		region: "asia-south1",
	},
	async () => {
		const now = new Date();
		const usersSnap = await db.collection("users").where("isActive", "!=", false).get();

		let usersWithAssignments = 0;
		let tasksAssigned = 0;

		for (const userDoc of usersSnap.docs) {
			const userRef = userDoc.ref;
			const user = userDoc.data() || {};
			const timeZone = typeof user.homeTimezone === "string" && user.homeTimezone ? user.homeTimezone : "Asia/Kolkata";
			const todayKey = getLocalDateInfo(now, timeZone).dayKey;

			if (user.lastTaskGenerationDate === todayKey) {
				continue;
			}

			const assigned = await assignDailyTasksForUser(userRef, user, todayKey);
			if (assigned > 0) {
				usersWithAssignments += 1;
				tasksAssigned += assigned;
			}
		}

		logger.info("phase3DailyTaskBackfillCron completed", {
			usersWithAssignments,
			tasksAssigned,
		});
	}
);
