// Shared style maps for status and priority badges.
// Used by TaskCard, StatusSummaryBar, InlineStatusSelect, and TaskDetail.

export const STATUS_STYLES: Record<string, string> = {
  'To Do':       'bg-gray-100 text-gray-700 border-gray-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Blocked':     'bg-red-100 text-red-700 border-red-200',
  'Done':        'bg-green-100 text-green-700 border-green-200',
};

export const PRIORITY_STYLES: Record<string, string> = {
  High:   'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:    'bg-green-100 text-green-700 border-green-200',
};
