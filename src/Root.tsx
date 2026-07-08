import "./index.css";
import React from "react";
import { Composition, Folder } from "remotion";
import { MyComposition } from "./Composition";
import { M5Comparison, M5ComparisonShorts } from "./projects/m5-comparison";
import { MimoIntelligence, TokenUsage } from "./projects/0505";
import {
  ExploitChain,
  MemoryIntegrityEnforcement,
  PrivilegeEscalation,
} from "./projects/mie";
import {
  BookReviewShorts,
  NarrativeEpisode,
  EpisodeThumbnail,
} from "./projects/book-review";
import { EPISODES } from "../episodes";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
      />
      <Folder name="MacBook-Comparisons">
        <Composition
          id="M5-GPU-Comparison"
          component={M5Comparison}
          durationInFrames={300}
          fps={30}
          width={1280}
          height={720}
        />
        <Composition
          id="M5-GPU-Comparison-Shorts"
          component={M5ComparisonShorts}
          durationInFrames={450}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
      <Folder name="0505-Xiaomi">
        <Composition
          id="Mimo-Intelligence"
          component={MimoIntelligence}
          durationInFrames={210}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="Token-Usage"
          component={TokenUsage}
          durationInFrames={270}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
      <Folder name="Book-Review">
        <Composition
          id="Book-Review-Shorts"
          component={BookReviewShorts}
          durationInFrames={540}
          fps={30}
          width={1080}
          height={1920}
        />
        {EPISODES.map((ep) => {
          const fps = ep.fps ?? 30;
          const durationInFrames = Math.round(ep.durationSec * fps);
          return (
            <React.Fragment key={ep.id}>
              <Composition
                id={`Book-Review-${ep.id.toUpperCase()}-Narrative`}
                component={NarrativeEpisode}
                durationInFrames={durationInFrames}
                fps={fps}
                width={1080}
                height={1920}
                defaultProps={{ episode: ep }}
              />
              <Composition
                id={`Book-Review-${ep.id.toUpperCase()}-Thumbnail`}
                component={EpisodeThumbnail}
                durationInFrames={60}
                fps={fps}
                width={1080}
                height={1920}
                defaultProps={{ episode: ep }}
              />
            </React.Fragment>
          );
        })}
      </Folder>
      <Folder name="Apple-Security">
        <Composition
          id="Memory-Integrity-Enforcement"
          component={MemoryIntegrityEnforcement}
          durationInFrames={270}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="Exploit-Chain"
          component={ExploitChain}
          durationInFrames={270}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="Privilege-Escalation"
          component={PrivilegeEscalation}
          durationInFrames={270}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
    </>
  );
};
