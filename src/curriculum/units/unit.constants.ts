/** Error messages returned by the unit routes. */
export const UNIT_ERRORS = {
  NOT_FOUND: (id: string) => `Unit ${id} not found`,
  MODULE_NOT_FOUND: 'Module does not exist',
  REORDER_MISMATCH: 'unitIds must list every unit of the module exactly once',
  // Decision Log D28: moving and reordering are Draft-only.
  MOVE_NEEDS_DRAFT:
    'A unit can move only between Draft modules. Published and Unpublished modules have no Move.',
  REORDER_NEEDS_DRAFT:
    'Units can be reordered only in a Draft module. A published module keeps its order.',
} as const;
