'use client';

import { Task, Label } from '@/types/kanban';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { AnimatePresence, motion } from 'framer-motion';
import { ColumnHeader } from './ColumnHeader';
import { TaskCard } from './TaskCard';
import { QuickAdd } from './QuickAdd';

interface ColumnProps {
  columnId: string;
  title: string;
  tasks: Task[];
  labels: Label[];
  index: number;
  onRenameColumn: (title: string) => void;
  onDeleteColumn: () => void;
  onAddTask: (title: string) => void;
  onClickTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export function Column({
  columnId,
  title,
  tasks,
  labels,
  index,
  onRenameColumn,
  onDeleteColumn,
  onAddTask,
  onClickTask,
  onDeleteTask,
  onCompleteTask,
}: ColumnProps) {
  return (
    <Draggable draggableId={columnId} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="flex-shrink-0 w-[280px] flex flex-col bg-board-column rounded-lg
            border border-board-border max-h-[calc(100vh-7.5rem)]"
        >
          <div {...provided.dragHandleProps}>
            <ColumnHeader
              title={title}
              count={tasks.length}
              onRename={onRenameColumn}
              onDelete={onDeleteColumn}
            />
          </div>

          <Droppable droppableId={columnId} type="task">
            {(dropProvided, snapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className="flex-1 overflow-y-auto px-2.5 pb-1 min-h-[40px]
                  transition-colors duration-200 rounded-b-lg"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {tasks.map((task, taskIndex) => (
                    <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                      {(dragProvided, dragSnapshot) => (
                        // @ts-ignore
                        <motion.div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`transition-shadow duration-100
                          ${dragSnapshot.isDragging ? 'opacity-95 rotate-[1deg] scale-[1.02]' : ''}`}
                        >
                          <TaskCard
                            task={task}
                            labels={labels}
                            onClick={() => onClickTask(task)}
                            onDelete={() => onDeleteTask(task.id)}
                            onComplete={() => onCompleteTask(task.id)}
                          />
                        </motion.div>
                      )}
                    </Draggable>
                  ))}
                </AnimatePresence>
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>

          <QuickAdd onAdd={onAddTask} />
        </div>
      )}
    </Draggable>
  );
}
