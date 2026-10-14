import { memo, useMemo } from 'react';

import { CONTENT } from '@/data';
import { useFossilRecord } from '@/state/selectors';
import { type CardDetailAction, CardDetailSheet } from '@/ui';

import type { HandEntry } from '../hand';
import { BATTLE_TEXT } from '../strings';

export interface BattleCardDetailProps {
  /** Hand card to show; null closes the sheet. */
  entry: HandEntry | null;
  /** Card plays are blocked right now. */
  locked: boolean;
  reducedMotion: boolean;
  onClose: () => void;
  onPlay: (uid: string) => void;
}

/** Long-press detail of a hand card with fossil facts and an "Ausspielen" action. */
export const BattleCardDetail = memo(function BattleCardDetail({
  entry,
  locked,
  reducedMotion,
  onClose,
  onPlay,
}: BattleCardDetailProps) {
  const fossilId = entry?.def.fossilId ?? '';
  const record = useFossilRecord(fossilId);
  const fossil = entry ? CONTENT.fossils[fossilId] : undefined;

  const uid = entry?.uid;
  const affordable = entry?.affordable ?? false;
  const action = useMemo<CardDetailAction | undefined>(
    () =>
      uid === undefined || locked
        ? undefined
        : {
            label: affordable ? BATTLE_TEXT.play : BATTLE_TEXT.notEnoughEnergy,
            onPress: () => onPlay(uid),
            disabled: !affordable,
          },
    [uid, locked, affordable, onPlay],
  );

  return (
    <CardDetailSheet
      def={entry?.def ?? null}
      upgraded={entry?.upgraded ?? false}
      fossil={fossil}
      fossilDiscovered={record !== null}
      visible={entry !== null}
      onClose={onClose}
      primaryAction={action}
      previewDamage={entry?.previewDamage}
      reducedMotion={reducedMotion}
      testID="card-detail"
    />
  );
});
