const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function createIndex(inputFile, outputFile) {
    const inputPath = path.join(__dirname, inputFile);
    const outputPath = path.join(__dirname, outputFile);
    
    const rl = readline.createInterface({
        input: fs.createReadStream(inputPath),
        crlfDelay: Infinity
    });

    const wordMap = {}

    let entries = [];
    let lineNumber = 0;

    for await (const line of rl) {
        lineNumber++;
        try {
            const json = JSON.parse(line);
            if (json.word) {
                if (!wordMap[json.word.toLowerCase()]) {
                    wordMap[json.word.toLowerCase()] = [lineNumber];
                }
                else {
                    wordMap[json.word.toLowerCase()].push(lineNumber);
                }
            }
        } catch (error) {
            console.error(error)
            console.error(`Skipping invalid JSON at line ${lineNumber}`);
        }
    }

    for (const [key, value] of Object.entries(wordMap)) {
        entries.push(`${key},${value.join(',')}`);
    }

    entries.sort(); // Sort alphabetically based on character code

    fs.writeFileSync(outputPath, entries.join('\n') + '\n');
    console.log(`Index file '${outputFile}' created successfully.`);
}

const inputFile = '../data/cleaned_german.jsonl';  // Change this to your input file name
const outputFile = '../data/german.idx';
createIndex(inputFile, outputFile);
