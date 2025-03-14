import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../stores/game-store'

interface GameRow {
  key: string
  score: number
  type: 'current' | 'old'
}
export const HighScore = memo(function HighScore() {
  const currentScore = useGameStore(useShallow((state) => state.currentGame.score))
  const currentGameRow = useMemo(
    () => ({ score: currentScore, key: 'current', type: 'current' }) satisfies GameRow,
    [currentScore]
  )

  const oldGames = useGameStore(useShallow((state) => state.oldGames))

  const allGames = useMemo<readonly GameRow[]>(
    () =>
      [
        ...oldGames
          .toSorted((a, b) => b.score - a.score)
          .slice(0, 8)
          .filter((game) => game.score > 0)
          .map<GameRow>(
            (game) => ({ score: game.score, key: game.key, type: 'old' }) satisfies GameRow
          ),
        currentGameRow,
      ].toSorted((a, b) => b.score - a.score),
    [currentGameRow, oldGames]
  )

  return (
    <div className="rounded-xl border border-solid border-slate-700 p-4">
      <div className="mb-4 w-full border-b border-solid border-b-slate-700 text-xl font-bold">
        Highscore:
      </div>
      {allGames.map((game, index) => (
        <div key={game.key} className="flex items-center justify-between">
          <div className="text-sm text-base-content">{index + 1}.</div>
          <div className={clsx(game.type === 'current' && 'font-semibold text-blue-700 underline')}>
            {game.score.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
})
