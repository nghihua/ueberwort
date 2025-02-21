const fs = require('fs');
const path = require('path');
const readline = require('readline');

function differsByPunctuationOnly(word1, word2) {
  // Remove trailing punctuation from both words
  const cleanWord1 = word1.replace(/[^\w\s]|_/g, '').trim();
  const cleanWord2 = word2.replace(/[^\w\s]|_/g, '').trim();

  // Compare the cleaned words
  return cleanWord1 === cleanWord2;
}

function isEmpty(obj) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

async function cleanJsonl(inputFile, outputFile) {
  const inputPath = path.join(__dirname, inputFile);
  const outputPath = path.join(__dirname, outputFile);

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity,
  });

  const outputStream = fs.createWriteStream(outputPath);

  for await (const line of rl) {
    try {
      const json = JSON.parse(line);

      // Skip lines where "word" does not start with an alphabetical character
      if (json.word?.length <= 1 || !/^[A-Za-z]/.test(json.word)) {
        continue;
      }

      // Delete specified properties
      delete json.pos;
      delete json.lang;
      delete json.lang_code;
      delete json.etymology_templates;
      delete json.etymology_text;
      delete json.related;
      delete json.forms;
      delete json.inflection_templates;
      delete json.etymology_number;
      delete json.descendants;
      delete json.info_templates;
      delete json.hyponyms;
      delete json.wikipedia;
      delete json.categories;
      delete json.derived;

      if (json.synonyms) {
        json.synonyms = json.synonyms
              .map((synonym) => synonym.word)
              .join('*');
      }

      json.examples = [];
      json.meaning = '';
      json.audio = json.sounds?.[0]?.mp3_url ?? json.sounds?.[0]?.ogg_url ?? '';
      json.expansion = json.head_templates?.[0].expansion;
      json.hyphenation = json.hyphenation?.[0];

      if (
        json.expansion &&
        differsByPunctuationOnly(json.word, json.expansion)
      ) {
        json.word = json.expansion;
      }

      delete json.head_templates;
      delete json.sounds;

      // Iterate into the "senses" array and delete "categories" property
      if (Array.isArray(json.senses)) {
        json.senses.forEach((sense) => {
          delete sense.categories;
          delete sense.tags;
          delete sense.topics;
          delete sense.links;

          if (sense.examples && !json.examples.length) {
            json.examples.push(sense.examples[0]);
          }

          if (sense.synonyms?.length > 0) {
            json.synonyms = sense.synonyms
              .map((synonym) => synonym.word)
              .join('*');
          }

          if (
            sense.form_of?.[0]?.word &&
            sense.form_of[0].word.trim() !== json.word.trim()
          ) {
            json.form_of = sense.form_of[0].word;
          }

          const glosses = sense.raw_glosses ?? sense.glosses ?? [];

          json.meaning += `*${glosses.join('*')}*`;
        });
      }

      delete json.senses;
      delete json.expansion;

      // Remove keys with empty string or empty array values
      for (const key in json) {
        if (
          json[key] === '' ||
          (Array.isArray(json[key]) && json[key].length === 0) ||
          isEmpty(json[key])
        ) {
          delete json[key];
        }
      }

      outputStream.write(JSON.stringify(json) + '\n');
    } catch (error) {
      console.error('Skipping invalid JSON line', error);
    }
  }

  outputStream.end();
  console.log(`Cleaned JSONL file written to '${outputFile}'`);
}

const inputFile = '../data/german.jsonl'; // Change this to your input file name
const outputFile = '../data/cleaned_german.jsonl';
cleanJsonl(inputFile, outputFile);
