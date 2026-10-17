// PRD FR-CUR-012: deleting a record hides it instead of erasing it. Every read
// of modules and units adds this filter; a delete sets `deletedAt`.
export const NOT_DELETED = { deletedAt: null } as const;
