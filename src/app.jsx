import { useState, useEffect } from 'preact/hooks'
import './app.css'
import { recordService } from './record-service';

let audioContext = null;

const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
}

const getAudioSamples = (audio) => {
  initAudioContext();
  return new Promise(async (resolve, reject) => {
    const buffer = await audio.arrayBuffer();
    audioContext.decodeAudioData(buffer, function(buff) {
      resolve({
        sampleRate: buff.sampleRate,
        samples: buff.getChannelData(0)
      })
    });
  });
}

const playSamples = ({ samples, sampleRate }, playbackRate = 1, reverse = false) => {
    initAudioContext();
    audioContext.resume();
    let audioBuffer = audioContext.createBuffer(1, samples.length, sampleRate);
    let audio = audioBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      const index = reverse ? samples.length - i - 1 : i;
      audio[i] = samples[index];
    }
    let source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.playbackRate.value = playbackRate;
    source.start();
}

function RecordButton ({ onRecordStopped }) {
  const [isRecordingQueued, setIsRecordingQueued] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const label = isRecording ? 'Stop Recording' : 'Record';
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

  return <button className="audio-button" disabled={isRecordingQueued && !isRecording || isRecording && !isRecordingQueued} onClick={onClick}>{label}</button>
}

export function App() {
  const [sampleData, setSampleData] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const onRecordStopped = async (chunks) => {
    const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
    setSampleData(await getAudioSamples(blob));
  };

  const onPlay = () => {
    if (!sampleData) {
      return;
    }
    playSamples(sampleData, playbackRate);
  }

  const onPlayReversed = () => {
    if (!sampleData) {
      return;
    }
    playSamples(sampleData, playbackRate, true);
  }

  return (
    <>
      <h1>Oidua</h1>
      <RecordButton onRecordStopped={onRecordStopped} />
      <button className="audio-button" disabled={!sampleData} onClick={onPlay}>Play</button>
      <button className="audio-button" disabled={!sampleData} onClick={onPlayReversed}>yalP</button>
      <label>
        <span className="playback-rate">{playbackRate}x</span>
        <input value={playbackRate} onChange={(event) => setPlaybackRate(event.target.value)} type="range" min="0.1" max="1" step="0.1" className="audio-button" disabled={!sampleData} />
      </label>
    </>
  )
}
