/** Error messages returned by the unit routes. */
export const UNIT_ERRORS = {
  NOT_FOUND: (id: string) => `Unit ${id} not found`,
  MODULE_NOT_FOUND: 'Module does not exist',
  REORDER_MISMATCH: 'unitIds must list every unit of the module exactly once',
} as const;
