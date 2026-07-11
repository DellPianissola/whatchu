export const INCLUDE_ADDED_BY = {
  addedBy: { select: { id: true, name: true, avatarUrl: true } },
}

export const COUNT_MOVIES = {
  _count: { select: { movies: true } },
}
