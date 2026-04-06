'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/contexts/LanguageContext'

interface ResultReport {
  id: string
  status: string
  game_outcomes: string[]
  reported_at: string | null
  confirmed_at: string | null
  deadline_at: string
  attempt_count: number
  attempts_remaining: number
}

interface OpponentReport {
  status: string
  has_reported: boolean
  confirmed_at: string | null
  game_outcomes: string[] | null
}

interface ResultData {
  my_report: ResultReport | null
  opponent_report: OpponentReport | null
  status: string
  deadline_at: string | null
  attempts_remaining: number
  max_attempts: number
  games_planned: number | null
}

interface Props {
  scrimId: string
  opponentName: string
  scheduledAt: string
  gamesPlanned: number
}

const STATUS_BADGE: Record<string, { label: string; variant: 'gold' | 'teal' | 'muted' | 'danger' }> = {
  pending:          { label: 'Aguardando report', variant: 'muted' },
  reported:         { label: 'Aguardando adversário', variant: 'gold' },
  waiting_opponent: { label: 'Aguardando adversário', variant: 'gold' },
  confirmed:        { label: 'Confirmado', variant: 'teal' },
  disputed:         { label: 'Contestado', variant: 'danger' },
  unresolvable:     { label: 'Irresolvível', variant: 'danger' },
  expired:          { label: 'Expirado', variant: 'muted' },
  no_request:       { label: 'Scrim manual', variant: 'muted' },
}

export function ScrimResultReport({ scrimId, opponentName, scheduledAt, gamesPlanned }: Props) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [outcomes, setOutcomes] = useState<string[]>([])

  const isPast = new Date(scheduledAt) < new Date()

  const { data, isLoading } = useQuery<{ data: ResultData }>({
    queryKey: ['scrim-result', scrimId],
    queryFn: () => fetch(`/api/scrims/${scrimId}/result`).then((r) => r.json()),
    enabled: isPast,
  })

  const result = data?.data
  const gameCount = result?.games_planned ?? gamesPlanned

  const submitMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/scrims/${scrimId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_outcomes: outcomes }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrim-result', scrimId] })
      setOutcomes([])
    },
  })

  if (!isPast) return null

  const canReport =
    result &&
    ['pending', 'disputed'].includes(result.status) &&
    result.attempts_remaining > 0

  const badge = STATUS_BADGE[result?.status ?? 'pending']

  function toggleOutcome(idx: number) {
    setOutcomes((prev) => {
      const next = [...prev]
      next[idx] = next[idx] === 'win' ? 'loss' : next[idx] === 'loss' ? '' : 'win'
      return next
    })
  }

  function setOutcome(idx: number, value: 'win' | 'loss') {
    setOutcomes((prev) => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  const allFilled = outcomes.length === gameCount && outcomes.every((o) => o === 'win' || o === 'loss')

  return (
    <RetroPanel
      title={t('scrims.result.title')}
      badge={badge?.label}
    >
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded-sm bg-navy-deep" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Deadline & attempts info */}
          {result?.deadline_at && !['confirmed', 'unresolvable', 'expired', 'no_request'].includes(result.status) && (
            <div className="rounded-sm border border-gold/10 bg-navy-deep px-3 py-2 text-xs text-text-muted">
              <span className="font-mono uppercase tracking-widest text-text-dim mr-2">{t('scrims.result.deadline')}</span>
              {new Date(result.deadline_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {result.attempts_remaining < result.max_attempts && (
                <span className="ml-3 text-gold/70">
                  {t('scrims.result.attemptsLeft', { n: String(result.attempts_remaining), max: String(result.max_attempts) })}
                </span>
              )}
            </div>
          )}

          {/* Confirmed result display */}
          {result?.status === 'confirmed' && result.my_report && (
            <div className="space-y-2">
              <p className="text-xs text-text-muted font-mono uppercase tracking-widest">{t('scrims.result.yourResult')}</p>
              <div className="flex gap-1.5">
                {result.my_report.game_outcomes.map((o, i) => (
                  <span
                    key={i}
                    className={`rounded-sm border px-2 py-1 font-mono text-xs font-bold ${
                      o === 'win'
                        ? 'border-success/40 bg-success/10 text-success'
                        : 'border-danger/40 bg-danger/10 text-danger'
                    }`}
                  >
                    {o === 'win' ? 'W' : 'L'}
                  </span>
                ))}
              </div>
              {result.opponent_report?.game_outcomes && (
                <>
                  <p className="text-xs text-text-muted font-mono uppercase tracking-widest mt-2">
                    {opponentName}
                  </p>
                  <div className="flex gap-1.5">
                    {result.opponent_report.game_outcomes.map((o, i) => (
                      <span
                        key={i}
                        className={`rounded-sm border px-2 py-1 font-mono text-xs font-bold ${
                          o === 'win'
                            ? 'border-success/40 bg-success/10 text-success'
                            : 'border-danger/40 bg-danger/10 text-danger'
                        }`}
                      >
                        {o === 'win' ? 'W' : 'L'}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Dispute message */}
          {result?.status === 'disputed' && (
            <div className="rounded-sm border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
              {t('scrims.result.disputeMessage', { remaining: String(result.attempts_remaining), max: String(result.max_attempts) })}
            </div>
          )}

          {/* Waiting for opponent */}
          {result?.status === 'waiting_opponent' && (
            <p className="text-xs text-text-muted italic">{t('scrims.result.waitingOpponent', { opponent: opponentName })}</p>
          )}

          {/* Report form */}
          {canReport && (
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
                {result.status === 'disputed'
                  ? t('scrims.result.reReport')
                  : t('scrims.result.reportPrompt', { opponent: opponentName })}
              </p>

              <div className="space-y-1.5">
                {Array.from({ length: gameCount }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-14 font-mono text-xs text-text-dim">
                      {t('scrims.result.game', { n: String(i + 1) })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOutcome(i, 'win')}
                      className={`rounded-sm border px-3 py-1 font-mono text-xs font-bold transition-colors ${
                        outcomes[i] === 'win'
                          ? 'border-success/60 bg-success/15 text-success'
                          : 'border-gold/20 bg-navy-deep text-text-dim hover:border-success/40'
                      }`}
                    >
                      W
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutcome(i, 'loss')}
                      className={`rounded-sm border px-3 py-1 font-mono text-xs font-bold transition-colors ${
                        outcomes[i] === 'loss'
                          ? 'border-danger/60 bg-danger/15 text-danger'
                          : 'border-gold/20 bg-navy-deep text-text-dim hover:border-danger/40'
                      }`}
                    >
                      L
                    </button>
                  </div>
                ))}
              </div>

              {submitMutation.isError && (
                <p className="text-xs text-danger">{t('scrims.result.submitError')}</p>
              )}

              <Button
                variant="primary"
                size="sm"
                disabled={!allFilled}
                loading={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {t('scrims.result.submit')}
              </Button>
            </div>
          )}

          {result?.status === 'no_request' && (
            <p className="text-xs text-text-dim italic">{t('scrims.result.manualScrim')}</p>
          )}

          {result?.status === 'unresolvable' && (
            <p className="text-xs text-text-dim italic">{t('scrims.result.unresolvable')}</p>
          )}

          {result?.status === 'expired' && (
            <p className="text-xs text-text-dim italic">{t('scrims.result.expired')}</p>
          )}
        </div>
      )}
    </RetroPanel>
  )
}
