import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X } from 'phosphor-react-native';
import { COLORS, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { RunTask } from '../../services/taskService';

interface TaskSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  tasks: RunTask[];
  loading?: boolean;
  onSelectTask: (task: RunTask) => void;
  onSelectFreeRun: () => void;
}

const DIFFICULTY_COLORS = {
  Easy: '#10B981',
  Medium: '#F59E0B',
  Hard: '#E94560',
};

const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({
  visible,
  onClose,
  tasks,
  loading = false,
  onSelectTask,
  onSelectFreeRun,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Choose Your Task</Text>
              <Text style={styles.subtitle}>Select a task to begin your run</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={24} color={COLORS.almostBlack} weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator color={COLORS.accent} />
              </View>
            ) : null}

            {!loading && tasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No active tasks found</Text>
                <Text style={styles.emptySubtitle}>Add active tasks in Firestore collection auto</Text>
              </View>
            ) : null}

            {/* Task Cards */}
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                activeOpacity={0.7}
                onPress={() => onSelectTask(task)}
              >
                <View
                  style={[
                    styles.taskBar,
                    { backgroundColor: DIFFICULTY_COLORS[task.difficulty] },
                  ]}
                />
                <View style={styles.taskContent}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View
                      style={[
                        styles.difficultyBadge,
                        { backgroundColor: DIFFICULTY_COLORS[task.difficulty] },
                      ]}
                    >
                      <Text style={styles.difficultyText}>{task.difficulty}</Text>
                    </View>
                  </View>
                  <Text style={styles.taskDescription}>
                    {task.targetKm}km • {task.targetMinutes} minutes
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Free Run Option */}
            <TouchableOpacity
              style={styles.freeRunCard}
              activeOpacity={0.7}
              onPress={onSelectFreeRun}
            >
              <Text style={styles.freeRunTitle}>Free Run</Text>
              <Text style={styles.freeRunSubtitle}>No specific target</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.mediumGrey,
    marginTop: 4,
    fontFamily: Typography.fontFamily,
  },
  scrollView: {
    paddingHorizontal: Spacing.lg,
  },
  loaderContainer: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: COLORS.offWhite,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.offWhite,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  taskBar: {
    width: 4,
  },
  taskContent: {
    flex: 1,
    padding: Spacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: Typography.fontFamily,
  },
  taskDescription: {
    fontSize: 14,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
  },
  freeRunCard: {
    backgroundColor: COLORS.offWhite,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  freeRunTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
    marginBottom: 4,
  },
  freeRunSubtitle: {
    fontSize: 14,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
  },
  cancelButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: COLORS.offWhite,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
  },
});

export default TaskSelectionModal;
