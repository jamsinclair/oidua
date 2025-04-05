import { useState, useEffect } from 'preact/hooks'
import './app.css'
import { recordService } from './record-service';
import { getTimeStretchedSamples } from './stretch';
import strings from './strings.json';

const language = document.documentElement.lang || 'en';

const PLAYBACK_WIDTH_PLAY_VAR = '--playback-width-play';
const PLAYBACK_WIDTH_REVERSE_VAR = '--playback-width-reverse';

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

const calculateAudioDuration = (audioBuffer, sampleRate) => {
  const numberOfSamples = audioBuffer.length;
  const durationInSeconds = numberOfSamples / sampleRate;
  return durationInSeconds;
}

function RecordButton ({ onRecordStart, onRecordStopped }) {
  const [isRecordingQueued, setIsRecordingQueued] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const label = isRecording ? localeStrings.recordStopButtonLabel : localeStrings.recordButtonLabel;
  const ariaLabel = isRecording ? localeStrings.recordStopButtonAriaLabel : localeStrings.recordButtonAriaLabel;
  const onClick = () => { setIsRecordingQueued(!isRecordingQueued) }
  
  useEffect(() => {
    if (isRecordingQueued && !isRecording) {
      onRecordStart();
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

  return <button
    className="audio-button"
    aria-label={ariaLabel}
    onClick={onClick}
    disabled={isRecordingQueued && !isRecording || isRecording && !isRecordingQueued}>
      { isRecording ? <span className="record-indicator"></span> : null } {label}
  </button>
}

function Footer () {
  if (language === 'ja') {
    return <footer>
      <p>Other languages? <a href="/">English</a>, <a href="/zh/">中文</a>, <a href="/ko/">한국어</a>, <a href="/es/">Español</a></p>
      <p>作成者: <a href="https://github.com/jamsinclair">jamsinclair</a></p>
      <p>ソースコードは<a href="https://github.com/jamsinclair/oidua">GitHub</a>にホストされています</p>
    </footer>
  } else if (language === 'ko') {
    return <footer>
      <p>다른 언어? <a href="/">English</a>, <a href="/zh/">中文</a>, <a href="/ja/">日本語</a>, <a href="/es/">Español</a></p>
      <p>만든 사람: <a href="https://github.com/jamsinclair">jamsinclair</a></p>
      <p>소스 코드: <a href="https://github.com/jamsinclair/oidua">GitHub</a>에서 호스팅</p>
    </footer>
  }  else if (language === 'zh') {
    return <footer>
        <p>其他语言？<a href="/">English</a>, <a href="/ja/">日本語</a>, <a href="/ko/">한국어</a>, <a href="/es/">Español</a></p>
        <p>创建者：<a href="https://github.com/jamsinclair">jamsinclair</a></p>
        <p>源代码托管在 <a href="https://github.com/jamsinclair/oidua">GitHub</a></p>
    </footer>
  } else if (language === 'es') {
    return <footer>
      <p>¿Otros idiomas? <a href="/">English</a>, <a href="/zh/">中文</a>, <a href="/ja/">日本語</a>, <a href="/ko/">한국어</a></p>
      <p>Creado por <a href="https://github.com/jamsinclair">jamsinclair</a></p>
      <p>Código fuente alojado en <a href="https://github.com/jamsinclair/oidua">GitHub</a></p>
    </footer>
  }

  return <footer>
    <p>Other languages? <a href="/zh/">中文</a>, <a href="/ja/">日本語</a>, <a href="/ko/">한국어</a>, <a href="/es/">Español</a></p>
    <p>Created by <a href="https://github.com/jamsinclair">jamsinclair</a></p>
    <p>Source code hosted on <a href="https://github.com/jamsinclair/oidua">GitHub</a></p>
  </footer>
}

export function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [sampleData, setSampleData] = useState(null);
  const [currentPlaybackSource, setCurrentPlaybackSource] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [startedPlayback, setStartedPlayback] = useState([0, false]);
  const onRecordStopped = async (chunks) => {
    const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
    const { sampleRate, samples } = await getAudioSamples(blob);
    setSampleData({ '1': trimSilence(samples), sampleRate });
    setIsRecording(false);
  };

  const onPlay = () => {
    if (!sampleData) {
      return;
    }
    playSample();
  }

  const onPlayReversed = () => {
    if (!sampleData) {
      return;
    }
    playSample(true);
  }

  const stopPlayback = () => {
    if (currentPlaybackSource) {
      currentPlaybackSource.stop();
      currentPlaybackSource.disconnect();
      setCurrentPlaybackSource(null);
      setStartedPlayback([0, false]);
    }
  }

  const onRecordStart = () => {
    stopPlayback();
    setIsRecording(true);
  }

  const playSample = (reverse = false) => {
    stopPlayback();
    initAudioContext();
    audioContext.resume();
    const sampleRate = sampleData.sampleRate;
    let currentSamples = sampleData[String(playbackRate)];
    if (!currentSamples) {
      const originalSamples = sampleData['1'];
      currentSamples = getTimeStretchedSamples(originalSamples, playbackRate, 1, sampleRate);
      setSampleData({
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
    setCurrentPlaybackSource(source);
    setStartedPlayback([Date.now(), reverse]);
  }

  useEffect(() => {
    const [startTime, isReverse] = startedPlayback;

    if (startTime < 1) {
      return;
    }
    const targetProperty = isReverse ? PLAYBACK_WIDTH_REVERSE_VAR : PLAYBACK_WIDTH_PLAY_VAR;
    const duration = calculateAudioDuration(sampleData[String(playbackRate)], sampleData.sampleRate) * 1000;

    if (startTime + duration < Date.now()) {
      return;
    }

    document.documentElement.style.setProperty(PLAYBACK_WIDTH_PLAY_VAR, '0.01%');
    document.documentElement.style.setProperty(PLAYBACK_WIDTH_REVERSE_VAR, '0.01%');
    let currentRafId = null;

    const updatePlaybackWidth = () => {
      const currentTime = Date.now();
      const progress = Math.min((currentTime - startTime) / duration, 1);
      document.documentElement.style.setProperty(targetProperty, `${progress * 100}%`);
      if (progress < 1) {
        currentRafId = requestAnimationFrame(updatePlaybackWidth);
      } else {
        setStartedPlayback([0, false]);
        currentRafId = null;
      }
    }

    updatePlaybackWidth();

    return () => {
      if (currentRafId) {
        cancelAnimationFrame(currentRafId);
        currentRafId = null;
      }
      document.documentElement.style.setProperty(PLAYBACK_WIDTH_PLAY_VAR, '0.01%');
      document.documentElement.style.setProperty(PLAYBACK_WIDTH_REVERSE_VAR, '0.01%');
    }
  }, [startedPlayback]);

  return (
    <>
      <header>
        <h1>Oidua</h1>
        <p>{localeStrings.description1}</p>
        <p>{localeStrings.privacyNote}</p>
      </header>
      <main>
        <RecordButton onRecordStart={onRecordStart} onRecordStopped={onRecordStopped} />
        <button className="audio-button play"
          disabled={!sampleData || isRecording}
          onClick={onPlay}
          aria-label={localeStrings.playButtonAriaLabel}>
            {localeStrings.playButtonLabel}
        </button>
        <button className="audio-button reverse"
          disabled={!sampleData || isRecording}
          onClick={onPlayReversed}
          aria-label={localeStrings.playReverseButtonAriaLabel}>
            {localeStrings.playReverseButtonLabel}
        </button>
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
            disabled={!sampleData}
            aria-label={localeStrings.playbackSpeedControlLabel}
            aria-valuemin="0.5"
            aria-valuemax="1.5"
            aria-valuenow={playbackRate}
          />
        </label>
      </main>
      <Footer />
    </>
  )
}
