import 'kali/build/kali.min.js';

/**
 * Code sourced from http://infinity.github.io/Kali/demo.html
 * Changes:
 *  - Added sampleRate parameter
 *  - Removed comments
 *  - Changed method name to getTimeStretchedSamples
 *  - Use const and let instead of var
 */
export function getTimeStretchedSamples(inputData, stretchFactor, numChannels, sampleRate) {
    const numInputFrames = inputData.length / numChannels;
    const bufsize = 4096 * numChannels;

    const kali = new Kali(numChannels);
    kali.setup(sampleRate, stretchFactor, false);

    const completed = new Float32Array(Math.floor((numInputFrames / stretchFactor) * numChannels + 1));

    let inputOffset = 0;
    let completedOffset = 0;
    let loopCount = 0;
    let flushed = false;

    while (completedOffset < completed.length) {
        if (loopCount % 100 == 0) {
            console.log("Stretching", completedOffset / completed.length);
        }

        completedOffset += kali.output(completed.subarray(completedOffset, Math.min(completedOffset + bufsize, completed.length)));

        if (inputOffset < inputData.length) {
            const dataToInput = inputData.subarray(inputOffset, Math.min(inputOffset + bufsize, inputData.length));
            inputOffset += dataToInput.length;
            kali.input(dataToInput);
            kali.process();
        } else if (!flushed) {
            kali.flush();
            flushed = true;
        }

        loopCount++;
    }

    return completed;
}
