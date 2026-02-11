'use client';

import { useState, useCallback } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Task, UpdateTaskInput } from '@/types/kanban';
import { useBoard } from './hooks/useBoard';
import { useWebSocket } from './hooks/useWebSocket';
import { Column } from './Column';
import { TaskDetail } from './TaskDetail';
import { SyncStatus } from './SyncStatus';
import { LabelManager } from './LabelManager';
import { Priority } from '@/types/kanban';

export function Board() {
  const {
    board,
    loading,
    handleWSMessage,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    uploadAttachment,
    removeAttachment,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    updateTaskPositions,
    createLabel,
    updateLabel,
    deleteLabel,
  } = useBoard();

  const { isConnected } = useWebSocket(handleWSMessage);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [filter, setFilter] = useState<{ priority: Priority | 'all'; label: string | 'all' }>({
    priority: 'all',
    label: 'all',
  });

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || !board) return;

    const { source, destination, type } = result;

    // Column reorder
    if (type === 'column') {
      const sorted = [...board.columns].sort((a, b) => a.position - b.position);
      const [moved] = sorted.splice(source.index, 1);
      sorted.splice(destination.index, 0, moved);
      await reorderColumns(sorted.map(c => c.id));
      return;
    }

    // Task drag
    const sourceColumnId = source.droppableId;
    const destColumnId = destination.droppableId;

    const sourceTasks = board.tasks
      .filter(t => t.columnId === sourceColumnId)
      .sort((a, b) => a.position - b.position);

    const destTasks = sourceColumnId === destColumnId
      ? sourceTasks
      : board.tasks
        .filter(t => t.columnId === destColumnId)
        .sort((a, b) => a.position - b.position);

    const [movedTask] = sourceTasks.splice(source.index, 1);
    if (!movedTask) return;

    const targetTasks = sourceColumnId === destColumnId ? sourceTasks : [...destTasks];
    targetTasks.splice(destination.index, 0, movedTask);

    const updates = targetTasks.map((task, i) => ({
      taskId: task.id,
      columnId: destColumnId,
      position: (i + 1) * 1000,
    }));

    if (sourceColumnId !== destColumnId) {
      const sourceUpdates = sourceTasks.map((task, i) => ({
        taskId: task.id,
        columnId: sourceColumnId,
        position: (i + 1) * 1000,
      }));
      updates.push(...sourceUpdates);
    }

    await updateTaskPositions(updates);
  }, [board, reorderColumns, updateTaskPositions]);

  const handleUpdateTask = useCallback((taskId: string, input: UpdateTaskInput) => {
    updateTask(taskId, input);
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...input } as Task : null);
    }
  }, [updateTask, selectedTask]);

  const handleAddColumn = useCallback(async () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    await createColumn(title);
    setNewColumnTitle('');
    setAddingColumn(false);
  }, [newColumnTitle, createColumn]);

  const handleCompleteTask = useCallback(async (taskId: string) => {
    if (!board) return;
    // Find "Done" column - case insensitive, or fallback to last column
    const doneColumn = board.columns.find(c => c.title.toLowerCase() === 'done')
      || board.columns[board.columns.length - 1];

    if (doneColumn) {
      await moveTask(taskId, doneColumn.id, 'top');
    }
  }, [board, moveTask]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--board-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-board-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-board-text-secondary">Loading board...</span>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--board-bg)]">
        <div className="text-sm text-board-danger">Failed to load board</div>
      </div>
    );
  }

  const sortedColumns = [...board.columns].sort((a, b) => a.position - b.position);

  const currentSelectedTask = selectedTask
    ? board.tasks.find(t => t.id === selectedTask.id) || null
    : null;

  return (
    <div className="h-screen flex flex-col bg-[var(--board-bg)]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[var(--header-border)] bg-transparent">
        <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-2.5">
          {/* Top Row Mobile / Left Section Desktop */}
          <div className="flex items-center justify-between md:justify-start md:gap-4">
            {/* Title Group */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl shadow-lg shadow-board-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden text-[#D97757]">
                {/* Claude logo */}
                <svg overflow="visible" width="100%" height="100%" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation"><path d="M96.0000 40.0000 L99.5002 42.0000 L99.5002 43.5000 L98.5000 47.0000 L56.0000 57.0000 L52.0040 47.0708 L96.0000 40.0000 M96.0000 40.0000 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(330deg) scaleY(1.06) rotate(-330deg)' }}></path><path d="M80.1032 10.5903 L84.9968 11.6171 L86.2958 13.2179 L87.5346 17.0540 L87.0213 19.5007 L58.5000 58.5000 L49.0000 49.0000 L75.3008 14.4873 L80.1032 10.5903 M80.1032 10.5903 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(300deg) scaleY(1.015) rotate(-300deg)' }}></path><path d="M55.5002 4.5000 L58.5005 2.5000 L61.0002 3.5000 L63.5002 7.0000 L56.6511 48.1620 L52.0005 45.0000 L50.0005 39.5000 L53.5003 8.5000 L55.5002 4.5000 M55.5002 4.5000 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(270deg) scaleY(1.075) rotate(-270deg)' }}></path><path d="M23.4253 5.1588 L26.5075 1.2217 L28.5175 0.7632 L32.5063 1.3458 L34.4748 2.8868 L48.8202 34.6902 L54.0089 49.8008 L47.9378 53.1760 L24.8009 11.1886 L23.4253 5.1588 M23.4253 5.1588 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(240deg) scaleY(1.09) rotate(-240deg)' }}></path><path d="M8.4990 27.0019 L7.4999 23.0001 L10.5003 19.5001 L14.0003 20.0001 L15.0003 20.0001 L36.0000 35.5000 L42.5000 40.5000 L51.5000 47.5000 L46.5000 56.0000 L42.0002 52.5000 L39.0001 49.5000 L10.0000 29.0001 L8.4990 27.0019 M8.4990 27.0019 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(210deg) scaleY(0.97) rotate(-210deg)' }}></path><path d="M2.5003 53.0000 L0.2370 50.5000 L0.2373 48.2759 L2.5003 47.5000 L28.0000 49.0000 L53.0000 51.0000 L52.1885 55.9782 L4.5000 53.5000 L2.5003 53.0000 M2.5003 53.0000 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(180deg) scaleY(1.03) rotate(-180deg)' }}></path><path d="M17.5002 79.0264 L12.5005 79.0264 L10.5124 76.7369 L10.5124 74.0000 L19.0005 68.0000 L53.5082 46.0337 L57.0005 52.0000 L17.5002 79.0264 M17.5002 79.0264 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(150deg) scaleY(1.003624) rotate(-150deg)' }}></path><path d="M27.0004 92.9999 L25.0003 93.4999 L22.0003 91.9999 L22.5004 89.4999 L52.0003 50.5000 L56.0004 55.9999 L34.0003 85.0000 L27.0004 92.9999 M27.0004 92.9999 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(120deg) scaleY(1.01029) rotate(-120deg)' }}></path><path d="M51.9998 98.0000 L50.5002 100.0000 L47.5002 101.0000 L45.0001 99.0000 L43.5000 96.0000 L51.0003 55.4999 L55.5001 55.9999 L51.9998 98.0000 M51.9998 98.0000 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(90deg) scaleY(1.148957) rotate(-90deg)' }}></path><path d="M77.5007 86.9997 L77.5007 90.9997 L77.0006 92.4997 L75.0004 93.4997 L71.5006 93.0339 L47.4669 57.2642 L56.9998 50.0002 L64.9994 64.5004 L65.7507 69.7497 L77.5007 86.9997 M77.5007 86.9997 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(60deg) scaleY(1.136376) rotate(-60deg)' }}></path><path d="M89.0008 80.9991 L89.5008 83.4991 L88.0008 85.4991 L86.5007 84.9991 L78.0007 78.9991 L65.0007 67.4991 L55.0007 60.4991 L58.0000 51.0000 L62.9999 54.0001 L66.0007 59.4991 L89.0008 80.9991 M89.0008 80.9991 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(30deg) scaleY(1.15971) rotate(-30deg)' }}></path><path d="M82.5003 55.5000 L95.0003 56.5000 L98.0003 58.5000 L100.0000 61.5000 L100.0000 63.6587 L94.5003 66.0000 L66.5005 59.0000 L55.0003 58.5000 L58.0000 48.0000 L66.0005 54.0000 L82.5003 55.5000 M82.5003 55.5000 " fill="currentColor" style={{ transformOrigin: '50px 50px', transform: 'rotate(0deg) scaleY(0.988043) rotate(0deg)' }}></path></svg>
              </div>
              <h1 className="text-lg font-bold text-board-text tracking-tight truncate">Claude Board</h1>
            </div>

            {/* Status (Mobile Only) */}
            <div className="md:hidden">
              <SyncStatus connected={isConnected} />
            </div>
          </div>

          <div className="hidden md:block h-5 w-px bg-board-border" />

          {/* Filters Row Mobile / Center Section Desktop */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mb-0.5 scrollbar-none md:overflow-visible md:pb-0 md:mb-0">
            <select
              value={filter.priority}
              onChange={e => setFilter(prev => ({ ...prev, priority: e.target.value as Priority | 'all' }))}
              className="h-8 text-xs bg-board-input text-board-text border border-board-border rounded-md px-2.5
                outline-none focus:border-board-accent hover:border-board-accent/50 transition-colors cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="none">None</option>
            </select>

            <select
              value={filter.label}
              onChange={e => setFilter(prev => ({ ...prev, label: e.target.value }))}
              className="h-8 text-xs bg-board-input text-board-text border border-board-border rounded-md px-2.5
                outline-none focus:border-board-accent hover:border-board-accent/50 transition-colors cursor-pointer"
            >
              <option value="all">All Labels</option>
              {board.labels.map(label => (
                <option key={label.id} value={label.id}>{label.name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowLabelManager(true)}
              className="h-8 flex items-center whitespace-nowrap text-xs font-medium text-board-text-secondary hover:text-board-text
                border border-board-border rounded-md px-3 hover:bg-board-hover transition-colors"
            >
              Manage Labels
            </button>
          </div>

          {/* Status (Desktop Only) */}
          <div className="hidden md:flex items-center gap-3 md:ml-auto">
            <div className="h-5 w-px bg-board-border" />
            <SyncStatus connected={isConnected} />
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-5" style={{ isolation: 'isolate' }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="column">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-5 items-start h-full"
              >
                {sortedColumns.map((column, index) => {
                  const columnTasks = board.tasks
                    .filter(t => t.columnId === column.id)
                    .filter(t => {
                      if (filter.priority !== 'all' && t.priority !== filter.priority) return false;
                      if (filter.label !== 'all' && !t.labels.includes(filter.label)) return false;
                      return true;
                    })
                    .sort((a, b) => a.position - b.position);

                  return (
                    <Column
                      key={column.id}
                      columnId={column.id}
                      title={column.title}
                      tasks={columnTasks}
                      labels={board.labels}
                      index={index}
                      onRenameColumn={(title) => updateColumn(column.id, title)}
                      onDeleteColumn={() => deleteColumn(column.id)}
                      onAddTask={(title) => createTask({ title, columnId: column.id })}
                      onClickTask={setSelectedTask}
                      onDeleteTask={deleteTask}
                      onCompleteTask={handleCompleteTask}
                    />
                  );
                })}
                {provided.placeholder}

                {/* Add Column */}
                <div className="flex-shrink-0 w-[280px]">
                  {addingColumn ? (
                    <div className="bg-board-column rounded-lg border border-board-border p-3.5 space-y-3">
                      <input
                        autoFocus
                        value={newColumnTitle}
                        onChange={e => setNewColumnTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddColumn();
                          if (e.key === 'Escape') { setAddingColumn(false); setNewColumnTitle(''); }
                        }}
                        placeholder="Column title..."
                        className="w-full text-sm bg-transparent text-board-text border-b border-board-accent
                          outline-none pb-1.5 placeholder:text-board-text-tertiary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddColumn}
                          className="px-3.5 py-1.5 text-xs font-medium bg-board-accent text-white rounded-md
                            hover:bg-board-accent-hover transition-colors"
                        >
                          Add column
                        </button>
                        <button
                          onClick={() => { setAddingColumn(false); setNewColumnTitle(''); }}
                          className="px-3 py-1.5 text-xs text-board-text-secondary hover:text-board-text transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingColumn(true)}
                      className="w-full py-3 text-sm font-medium text-board-text-secondary hover:text-board-accent
                        border border-dashed border-board-border rounded-lg
                        hover:border-board-accent/40 hover:bg-board-accent-subtle
                        transition-all duration-200"
                    >
                      + Add Column
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </main>

      {/* Task Detail Modal */}
      {currentSelectedTask && (
        <TaskDetail
          task={currentSelectedTask}
          labels={board.labels}
          onUpdate={handleUpdateTask}
          onDelete={deleteTask}
          onUploadAttachment={uploadAttachment}
          onRemoveAttachment={removeAttachment}
          onClose={() => setSelectedTask(null)}
        />
      )}
      {/* Label Manager Modal */}
      {showLabelManager && (
        <LabelManager
          labels={board.labels}
          onAddLabel={createLabel}
          onUpdateLabel={updateLabel}
          onDeleteLabel={deleteLabel}
          onClose={() => setShowLabelManager(false)}
        />
      )}
    </div>
  );
}
