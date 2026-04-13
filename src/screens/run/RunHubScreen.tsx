import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Lightning, Play, Target } from 'phosphor-react-native';
import type { TabScreenProps } from '../../navigation';
import { subscribeToRunTasks, type RunTask } from '../../services/taskService';
import { useUserStore } from '../../stores/useUserStore';
import { COLORS, SPACING } from '../../constants/theme';

type Props = TabScreenProps<'Run'>;

const DIFFICULTY_COLORS: Record<RunTask['difficulty'], string> = {
  Easy: '#10B981',
  Medium: '#F59E0B',
  Hard: '#E94560',
};

const FREE_RUN_CONFIG = {
  taskId: 'free_run',
  taskTitle: 'Free Run',
  targetKm: 5,
  targetMinutes: 30,
  difficulty: 'Easy' as const,
};

const RunHubScreen: React.FC<Props> = ({ navigation }) => {
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasks, setTasks] = useState<RunTask[]>([]);
  const { homeTimezone, tier } = useUserStore();

  useEffect(() => {
    const unsubscribe = subscribeToRunTasks(
      (loadedTasks) => {
        setTasks(loadedTasks);
        setTasksLoading(false);
      },
      () => {
        setTasksLoading(false);
      },
      {
        homeTimezone,
        maxDailyTasks: tier === 'premium' ? 4 : 3,
      }
    );

    return unsubscribe;
  }, [homeTimezone, tier]);

  const actionTasks = useMemo(() => tasks.slice(0, 3), [tasks]);

  const navigateToRunTracking = (task: {
    taskId?: string;
    taskTitle?: string;
    targetKm?: number;
    targetMinutes?: number;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
  }) => {
    const parentNav = navigation.getParent();
    if (!parentNav) return;

    parentNav.navigate('RunTracking', task);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <Text style={styles.title}>Run Center</Text>
          <Text style={styles.subtitle}>Start instantly, or pick a daily target and track your streak.</Text>
        </View>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionCard, styles.primaryActionCard]}
            activeOpacity={0.85}
            onPress={() => navigateToRunTracking(FREE_RUN_CONFIG)}
          >
            <Play size={22} color="#FFFFFF" weight="fill" />
            <Text style={styles.primaryActionTitle}>Start Free Run</Text>
            <Text style={styles.primaryActionSubtitle}>Counts for streak if distance is at least 1.4 km.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            activeOpacity={0.85}
            onPress={() => {
              if (actionTasks.length > 0) {
                const firstTask = actionTasks[0];
                navigateToRunTracking({
                  taskId: firstTask.id,
                  taskTitle: firstTask.title,
                  targetKm: firstTask.targetKm,
                  targetMinutes: firstTask.targetMinutes,
                  difficulty: firstTask.difficulty,
                });
              }
            }}
            disabled={actionTasks.length === 0}
          >
            <Target size={22} color={COLORS.almostBlack} weight="bold" />
            <Text style={styles.secondaryActionTitle}>Start Daily Task</Text>
            <Text style={styles.secondaryActionSubtitle}>Jump directly into your first assigned task.</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Run Tasks</Text>
          <View style={styles.badgeRow}>
            <Lightning size={14} color={COLORS.accent} weight="fill" />
            <Text style={styles.badgeText}>{actionTasks.length} ready</Text>
          </View>
        </View>

        {tasksLoading ? (
          <View style={styles.loaderCard}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : null}

        {!tasksLoading && actionTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No daily tasks yet</Text>
            <Text style={styles.emptySubtitle}>Your next set of tasks will appear shortly.</Text>
          </View>
        ) : null}

        {actionTasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskCard}
            activeOpacity={0.85}
            onPress={() =>
              navigateToRunTracking({
                taskId: task.id,
                taskTitle: task.title,
                targetKm: task.targetKm,
                targetMinutes: task.targetMinutes,
                difficulty: task.difficulty,
              })
            }
          >
            <View style={[styles.taskStripe, { backgroundColor: DIFFICULTY_COLORS[task.difficulty] }]} />
            <View style={styles.taskBody}>
              <View style={styles.taskTopRow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[task.difficulty] }]}>
                  <Text style={styles.difficultyText}>{task.difficulty}</Text>
                </View>
              </View>
              <Text style={styles.taskMeta}>{task.targetKm} km • {task.targetMinutes} min</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  headerCard: {
    backgroundColor: '#FDF2F4',
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.almostBlack,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: COLORS.mediumGrey,
    lineHeight: 20,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#F4F4F5',
    padding: SPACING.md,
    minHeight: 150,
  },
  primaryActionCard: {
    backgroundColor: COLORS.accent,
  },
  primaryActionTitle: {
    marginTop: 10,
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryActionSubtitle: {
    marginTop: 6,
    fontFamily: 'Inter',
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  secondaryActionTitle: {
    marginTop: 10,
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.almostBlack,
  },
  secondaryActionSubtitle: {
    marginTop: 6,
    fontFamily: 'Inter',
    fontSize: 12,
    color: COLORS.mediumGrey,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.almostBlack,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  loaderCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 18,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 18,
    padding: SPACING.lg,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.almostBlack,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: COLORS.mediumGrey,
  },
  taskCard: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#F8F8F8',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  taskStripe: {
    width: 5,
  },
  taskBody: {
    flex: 1,
    padding: SPACING.md,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.almostBlack,
    flex: 1,
  },
  difficultyBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  difficultyText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  taskMeta: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: COLORS.mediumGrey,
  },
});

export default RunHubScreen;
