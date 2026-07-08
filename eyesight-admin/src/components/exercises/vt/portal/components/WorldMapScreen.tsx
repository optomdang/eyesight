/**
 * VT Quest — World Map screen (Phase 2).
 * Shows 3 planets with AI-generated images.
 * Unlocked planets are interactive; locked ones show a padlock overlay.
 * Boss stage indicator appears when stageIndex qualifies.
 */

import React, { useMemo } from 'react';
import { Box, Typography, Tooltip, Chip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import BoltIcon from '@mui/icons-material/Bolt';
import { WORLDS, isWorldUnlocked } from '../../gamification/worldMap';
import { isBossStage } from '../../gamification/worldMap';
import { COPY } from '../../gamification/copy.vi';
import type { VtWorld, VtSessionState } from 'src/types/core/vtQuest';

// AI-generated planet images (Phase 2)
import planetGaborImg from 'src/assets/vt-quest/planets/planet-gabor.png';
import planetVernierImg from 'src/assets/vt-quest/planets/planet-vernier.png';
import planetCrowdingImg from 'src/assets/vt-quest/planets/planet-crowding.png';
import mascotImg from 'src/assets/vt-quest/mascot/astronaut.png';

const PLANET_IMAGES: Partial<Record<VtWorld, string>> = {
  gabor: planetGaborImg,
  vernier: planetVernierImg,
  crowding: planetCrowdingImg,
};

interface WorldMapScreenProps {
  session: VtSessionState;
  onSelectWorld: (world: VtWorld) => void;
  /** Test/sandbox: all planets clickable regardless of progress */
  unlockAllWorlds?: boolean;
  /** Boss stage interval (from vtSettings.stagesPerSession) */
  bossCycle?: number;
}

/** Stable starfield — seeded from Math.random once via useMemo */
function useStarSeeds(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        size: (((i * 7 + 3) % 5) / 5) * 2 + 0.8,
        top: ((i * 31 + 17) % 100),
        left: ((i * 53 + 11) % 100),
        opacity: ((i * 13 + 7) % 7) / 10 + 0.3,
        duration: ((i * 19 + 5) % 20) / 10 + 1.5,
        delay: ((i * 41 + 3) % 20) / 10,
      })),
    [count]
  );
}

const StarField: React.FC = () => {
  const stars = useStarSeeds(35);
  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map((s) => (
        <Box
          key={s.id}
          sx={{
            position: 'absolute',
            width: s.size,
            height: s.size,
            top: `${s.top}%`,
            left: `${s.left}%`,
            borderRadius: '50%',
            bgcolor: 'white',
            opacity: s.opacity,
            animation: `twinkle-${s.id % 3} ${s.duration}s ease-in-out ${s.delay}s infinite`,
            '@keyframes twinkle-0': { '0%,100%': { opacity: 0.3 }, '50%': { opacity: 1 } },
            '@keyframes twinkle-1': { '0%,100%': { opacity: 0.2, transform: 'scale(1)' }, '50%': { opacity: 0.9, transform: 'scale(1.8)' } },
            '@keyframes twinkle-2': { '0%,100%': { opacity: 0.5 }, '60%': { opacity: 0.1 } },
          }}
        />
      ))}
    </Box>
  );
};

/** How many stages this world has been completed in this session */
function worldCompletedCount(session: VtSessionState, world: VtWorld): number {
  return session.completedStages.filter((s) => s.world === world).length;
}

const WorldMapScreen: React.FC<WorldMapScreenProps> = ({
  session,
  onSelectWorld,
  unlockAllWorlds = false,
  bossCycle = 5,
}) => {
  const completedCount = session.completedStages.length;
  const nextStageIndex = session.stageIndex;
  const showBossBadge = isBossStage(nextStageIndex, bossCycle);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 25%, #1e0a42 0%, #0a0520 55%, #000 100%)',
        position: 'relative',
        minHeight: 0,
        py: 4,
        px: 2,
        overflow: 'hidden',
      }}
    >
      <StarField />

      {/* Mascot — bottom right */}
      <Box
        component="img"
        src={mascotImg}
        alt="Phi hành gia"
        sx={{
          position: 'absolute',
          bottom: 12,
          right: 16,
          width: { xs: 64, sm: 88 },
          opacity: 0.92,
          animation: 'mascot-float 4s ease-in-out infinite',
          '@keyframes mascot-float': {
            '0%,100%': { transform: 'translateY(0) rotate(-3deg)' },
            '50%': { transform: 'translateY(-10px) rotate(3deg)' },
          },
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Title */}
      <Typography
        variant="h5"
        sx={{
          color: 'white',
          fontWeight: 900,
          mb: 0.5,
          letterSpacing: 0.5,
          textShadow: '0 0 24px rgba(108,92,231,0.9)',
          zIndex: 1,
        }}
      >
        {COPY.chooseWorld}
      </Typography>

      {/* Stage counter */}
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2, zIndex: 1 }}>
        Nhiệm vụ #{completedCount + 1}
      </Typography>

      {/* Boss badge */}
      {showBossBadge && (
        <Chip
          icon={<BoltIcon sx={{ color: '#FFD93D !important', fontSize: 16 }} />}
          label="NHIỆM VỤ ĐẶC BIỆT!"
          sx={{
            mb: 2,
            zIndex: 1,
            bgcolor: 'rgba(255,165,0,0.18)',
            border: '1.5px solid #FFD93D',
            color: '#FFD93D',
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 1,
            animation: 'pulse-boss 1.2s ease-in-out infinite',
            '@keyframes pulse-boss': {
              '0%,100%': { boxShadow: '0 0 8px rgba(255,217,61,0.4)' },
              '50%': { boxShadow: '0 0 22px rgba(255,217,61,0.9)' },
            },
          }}
        />
      )}

      {/* Planet grid */}
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 2, sm: 5 },
          flexWrap: 'wrap',
          justifyContent: 'center',
          zIndex: 1,
          mt: 1,
        }}
      >
        {WORLDS.map((world, idx) => {
          const unlocked = unlockAllWorlds || isWorldUnlocked(world.id, completedCount);
          const doneCount = worldCompletedCount(session, world.id);
          const floatDelay = idx * 0.8;

          return (
            <Tooltip
              key={world.id}
              title={
                unlocked
                  ? `${world.description}${doneCount > 0 ? ` (đã hoàn thành ${doneCount} lần)` : ''}`
                  : `🔒 Mở khoá sau ${world.unlockAfterStages} nhiệm vụ`
              }
              arrow
            >
              <Box
                onClick={() => unlocked && onSelectWorld(world.id)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  transition: 'transform 0.25s ease, filter 0.25s ease',
                  '&:hover': unlocked
                    ? {
                        transform: 'scale(1.12) translateY(-10px)',
                        filter: 'drop-shadow(0 12px 28px rgba(255,255,255,0.25))',
                      }
                    : {},
                  userSelect: 'none',
                }}
              >
                {/* Planet image */}
                <Box sx={{ position: 'relative' }}>
                  {PLANET_IMAGES[world.id] ? (
                    <Box
                      component="img"
                      src={PLANET_IMAGES[world.id]}
                      alt={world.label}
                      sx={{
                        width: { xs: 90, sm: 110 },
                        height: { xs: 90, sm: 110 },
                        objectFit: 'contain',
                        filter: unlocked
                          ? `drop-shadow(0 4px 18px ${world.color}88)`
                          : 'grayscale(70%) opacity(0.4)',
                        animation: unlocked
                          ? `planet-float-${idx} 3.5s ease-in-out ${floatDelay}s infinite`
                          : 'none',
                        [`@keyframes planet-float-0`]: {
                          '0%,100%': { transform: 'translateY(0)' },
                          '50%': { transform: 'translateY(-14px)' },
                        },
                        [`@keyframes planet-float-1`]: {
                          '0%,100%': { transform: 'translateY(-6px)' },
                          '50%': { transform: 'translateY(8px)' },
                        },
                        [`@keyframes planet-float-2`]: {
                          '0%,100%': { transform: 'translateY(4px)' },
                          '50%': { transform: 'translateY(-10px)' },
                        },
                        [`@keyframes planet-float-3`]: {
                          '0%,100%': { transform: 'translateY(-2px)' },
                          '50%': { transform: 'translateY(12px)' },
                        },
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: { xs: 90, sm: 110 },
                        height: { xs: 90, sm: 110 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: { xs: 44, sm: 52 },
                        filter: unlocked
                          ? `drop-shadow(0 4px 18px ${world.color}88)`
                          : 'grayscale(70%) opacity(0.4)',
                        animation: unlocked
                          ? `planet-float-${idx} 3.5s ease-in-out ${floatDelay}s infinite`
                          : 'none',
                        [`@keyframes planet-float-3`]: {
                          '0%,100%': { transform: 'translateY(-2px)' },
                          '50%': { transform: 'translateY(12px)' },
                        },
                      }}
                    >
                      {world.emoji}
                    </Box>
                  )}

                  {/* Lock overlay */}
                  {!unlocked && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.35)',
                      }}
                    >
                      <LockIcon sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 28 }} />
                    </Box>
                  )}

                  {/* Completed stages badge */}
                  {unlocked && doneCount > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        bgcolor: '#FFD93D',
                        color: '#000',
                        borderRadius: '50%',
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 900,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                    >
                      {doneCount}
                    </Box>
                  )}

                  {/* Boss stage flash ring for active worlds */}
                  {unlocked && showBossBadge && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: -6,
                        borderRadius: '50%',
                        border: `2.5px solid ${world.color}`,
                        animation: 'ring-pulse 1.5s ease-in-out infinite',
                        '@keyframes ring-pulse': {
                          '0%,100%': { opacity: 0.3, transform: 'scale(1)' },
                          '50%': { opacity: 1, transform: 'scale(1.08)' },
                        },
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </Box>

                {/* Label */}
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: unlocked ? 'white' : 'rgba(255,255,255,0.3)',
                    fontWeight: 800,
                    mt: 1.5,
                    textAlign: 'center',
                    fontSize: { xs: 11, sm: 13 },
                    textShadow: unlocked ? `0 0 12px ${world.color}` : 'none',
                    transition: 'text-shadow 0.3s',
                  }}
                >
                  {world.label}
                </Typography>

                {/* Sub-description */}
                <Typography
                  variant="caption"
                  sx={{
                    color: unlocked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                    fontSize: 10,
                    mt: 0.25,
                    textAlign: 'center',
                    maxWidth: 110,
                    lineHeight: 1.3,
                  }}
                >
                  {unlocked ? world.description : `🔒 ${world.unlockAfterStages} nhiệm vụ`}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};

export default WorldMapScreen;
