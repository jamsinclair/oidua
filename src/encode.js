import { createMp3Encoder } from "wasm-media-encoders/esnext";

export async function encodeToMp3({
    samples,
    sampleRate = 48000,
    bitRate = 320,
}) {
    const encoder = await createMp3Encoder();

    encoder.configure({
        sampleRate,
        channels: 1,
        bitRate,
    });

    const outputBuffer = encoder.encode(samples);
    const flushedBuffer = encoder.finalize();

    const output = new Uint8Array(outputBuffer.length + flushedBuffer.length);
    output.set(outputBuffer);
    output.set(flushedBuffer, outputBuffer.length);

    return output;
}

