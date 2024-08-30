import { useState, useEffect } from 'preact/hooks'
import './app.css'
import { recordService } from './record-service';
import { getTimeStretchedSamples } from './stretch';
import strings from './strings.json';

const language = window.location.pathname.startsWith('/ja') ? 'ja' : 'en';
const localeStrings = strings[language];
let audioContext = null;

const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
}

const getAudioSamples = async (audio) => {
  initAudioContext();
    const buffer = await audio.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(buffer);
    return {
      sampleRate: decoded.sampleRate,
      samples: decoded.getChannelData(0)
    };
}

const trimSilence = (samples, threshold = 1e-7) => {
  const firstAbove = samples.findIndex(value => value > threshold);
  const lastAbove = samples.findLastIndex(value => value > threshold);
  return samples.subarray(firstAbove > -1 ? firstAbove : 0, lastAbove > -1 ? lastAbove : undefined);
}

const playSamples = (sampleData, playbackRate = 1, reverse = false, updateSamplesCache) => {
    initAudioContext();
    audioContext.resume();
    const sampleRate = sampleData.sampleRate;
    let currentSamples = sampleData[String(playbackRate)];
    if (!currentSamples) {
      const originalSamples = sampleData['1'];
      currentSamples = getTimeStretchedSamples(originalSamples, playbackRate, 1, sampleRate);
      updateSamplesCache({
        ...sampleData,
        [String(playbackRate)]: currentSamples
      })
    }
    let audioBuffer = audioContext.createBuffer(1, currentSamples.length, sampleRate);
    let audio = audioBuffer.getChannelData(0);
    for (let i = 0; i < currentSamples.length; i++) {
      const index = reverse ? currentSamples.length - i - 1 : i;
      audio[i] = currentSamples[index];
    }
    let source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
}

function RecordButton ({ onRecordStopped }) {
  const [isRecordingQueued, setIsRecordingQueued] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const label = isRecording ? localeStrings.recordStopButtonLabel : localeStrings.recordButtonLabel;
  const ariaLabel = isRecording ? localeStrings.recordStopButtonAriaLabel : localeStrings.recordButtonAriaLabel;
  const onClick = () => { setIsRecordingQueued(!isRecordingQueued) }
  
  useEffect(() => {
    if (isRecordingQueued && !isRecording) {
      recordService.start().then(() => setIsRecording(true));
      return;
    }

    if (!isRecordingQueued && isRecording) {
      recordService.stop().then((data) => {
        onRecordStopped(data);
        setIsRecording(false)
      });
      return
    }
  }, [isRecording, isRecordingQueued]);

  return <button className="audio-button" aria-label={ariaLabel} disabled={isRecordingQueued && !isRecording || isRecording && !isRecordingQueued} onClick={onClick}>{label}</button>
}

export function App() {
  const [sampleData, setSampleData] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const onRecordStopped = async (chunks) => {
    const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
    const { sampleRate, samples } = await getAudioSamples(blob);
    setSampleData({ '1': trimSilence(samples), sampleRate });
  };

  const onPlay = () => {
    if (!sampleData) {
      return;
    }
    playSamples(sampleData, playbackRate, false, setSampleData);
  }

  const onPlayReversed = () => {
    if (!sampleData) {
      return;
    }
    playSamples(sampleData, playbackRate, true, setSampleData);
  }

  return (
    <>
      <header>
        <h1>Oidua</h1>
        <p>{localeStrings.description1}</p>
        <p>{localeStrings.privacyNote}</p>
      </header>
      <main>
        <RecordButton onRecordStopped={onRecordStopped} />
        <button className="audio-button" disabled={!sampleData} onClick={onPlay} aria-label={localeStrings.playButtonAriaLabel}>{localeStrings.playButtonLabel}</button>
        <button className="audio-button" disabled={!sampleData} onClick={onPlayReversed} aria-label={localeStrings.playReverseButtonAriaLabel}>{localeStrings.playReverseButtonLabel}</button>
        <label>
          <span className="playback-rate">{localeStrings.playbackSpeedLabel} {playbackRate}x</span>
          <input
            id="playbackRate"
            value={playbackRate}
            onChange={(event) => setPlaybackRate(event.target.value)}
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            className="audio-button"
            disabled={!sampleData}
            aria-label={localeStrings.playbackSpeedControlLabel}
            aria-valuemin="0.5"
            aria-valuemax="1.5"
            aria-valuenow={playbackRate}
          />
        </label>
      </main>
      <footer>
        { language === 'en' ?
        <p>
          Other languages? <a href="/ja/">日本語</a><br />
          Created by <a href="https://github.com/jamsinclair">jamsinclair</a><br />
          Source code hosted on <a href="https://github.com/jamsinclair/oidua">GitHub</a>
        </p> : <p>
          Other languages? <a href="/">English</a><br />
          作成者: <a href="https://github.com/jamsinclair">jamsinclair</a><br />
          ソースコードは<a href="https://github.com/jamsinclair/oidua">GitHub</a>にホストされています
        </p> }
      </footer>
    </>
  )
}
