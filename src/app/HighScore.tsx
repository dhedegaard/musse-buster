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
  const currentGameRow = useMemo(() => {
    const row: GameRow = { score: currentScore, key: 'current', type: 'current' }
    return row
  }, [currentScore])

  const oldGames = useGameStore(useShallow((state) => state.oldGames))

  const allGames = useMemo<readonly GameRow[]>(
    () =>
      [
        ...oldGames
          .toSorted((a, b) => b.score - a.score)
          .slice(0, 8)
          .filter((game) => game.score > 0)
          .map<GameRow>((game) => {
            const row: GameRow = { score: game.score, key: game.key, type: 'old' }
            return row
          }),
        currentGameRow,
      ].toSorted((a, b) => b.score - a.score),
    [currentGameRow, oldGames]
  )

  return (
    <div className="border border-solid border-slate-700 p-4 rounded-xl">
      <div className="text-xl font-bold w-full border-b border-solid border-b-slate-700 mb-4">
        Highscore:
      </div>
      {allGames.map((game, index) => (
        <div key={game.key} className="flex items-center justify-between">
          <div className="text-sm text-base-content">{index + 1}.</div>
          <div className={clsx(game.type === 'current' && 'text-blue-700 font-semibold underline')}>
            {game.score.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
})
