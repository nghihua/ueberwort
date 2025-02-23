/*
 Überwort: German - English Popup Dictionary
 Copyright (C) 2025 Nghi Hua

---

 Originally based on Zhongwen 6.2.0
 Copyright (C) 2010-2019 Christian Schiller
 https://chrome.google.com/extensions/detail/kkmlkkjojmombglmlpbpapmhcaljjkde

 ---

 Originally based on Rikaikun 0.8
 Copyright (C) 2010 Erek Speed
 http://code.google.com/p/rikaikun/

 ---

 Originally based on Rikaichan 1.07
 by Jonathan Zarate
 http://www.polarcloud.com/

 ---

 Originally based on RikaiXUL 0.4 by Todd Rudick
 http://www.rikai.com/
 http://rikaixul.mozdev.org/

 ---

 This program is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 2 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

 ---

 Please do not change or remove any of the copyrights or links to web pages
 when modifying any of the files.

 */

'use strict';

export class GermanDictionary {
  constructor(wordDict, wordIndex) {
    this.wordDict = wordDict;
    this.wordIndex = wordIndex;
    this.cache = {};
  }

  static find(needle, haystack) {
    let beg = 0;
    let end = haystack.length - 1;

    while (beg < end) {
      let mi = Math.floor((beg + end) / 2);
      let i = haystack.lastIndexOf('\n', mi) + 1;

      let mis = haystack.substr(i, needle.length);
      if (needle < mis) {
        end = i - 1;
      } else if (needle > mis) {
        beg = haystack.indexOf('\n', mi + 1) + 1;
      } else {
        return haystack.substring(i, haystack.indexOf('\n', mi + 1));
      }
    }

    return null;
  }

  getLineFromString(data, targetLine) {
    let startIdx = 0;
    let currentLine = 1;

    while (currentLine < targetLine) {
      startIdx = data.indexOf('\n', startIdx);
      if (startIdx === -1) return null; // Line doesn't exist
      startIdx++; // Move past the newline
      currentLine++;
    }

    let endIdx = data.indexOf('\n', startIdx);
    return endIdx === -1 ? data.slice(startIdx) : data.slice(startIdx, endIdx);
  }

  // when a word is not found, attempt to split the word
  // to search its small part
  splitWord(word) {
    if (word.includes('-')) return word.split('-');
    if (word.includes('.')) return word.split('.');
    return [word.substr(0, word.length - 1)];
  }

  wordSearch(word, max) {
    let entry = { data: [] };

    let dict = this.wordDict;
    let index = this.wordIndex;
    let split = false;

    let maxTrim = max || 7;

    let count = 0;
    let maxLen = 0;

    const words = [
      {
        text: word,
        atomic: false,
      },
    ];

    const dataMap = {};

    WHILE: while (words.length > 0) {
      const wordData = words.shift();
      const wordText = wordData.text;
      if (dataMap[wordText]) continue;
      console.log('wordText', wordText);

      let ix = this.cache[wordText];
      if (!ix) {
        ix = GermanDictionary.find(wordText.toLowerCase() + ',', index);
        console.log('ix', ix);
        if (!ix) {
          if (!wordData.atomic) {
            const splitWords = this.splitWord(wordText).filter((w) => w.trim());
            console.log('splitWords', [...splitWords]);
            if (splitWords.length > 1) {
              split = true;
            }
            words.unshift(
              ...splitWords.map((w) => ({
                text: w,
                atomic: false,
              }))
            );
          }
          continue;
        }
        ix = ix.split(',');
        this.cache[wordText] = ix;
      }

      let parsedDEntry = null;

      for (let j = 1; j < ix.length; ++j) {
        let offset = ix[j];

        let dentry = this.getLineFromString(dict, offset);

        console.log('j', j, dentry);

        if (count >= maxTrim) {
          entry.more = 1;
          break WHILE;
        }

        ++count;
        if (maxLen === 0) {
          maxLen = wordText.length;
        }

        try {
          const currentEntry = JSON.parse(dentry);
          if (parsedDEntry) {
            parsedDEntry = {
              ...parsedDEntry,
              meaning: (parsedDEntry.meaning += currentEntry.meaning),
            };
          } else {
            parsedDEntry = currentEntry;
          }
          if (parsedDEntry.form_of) {
            words.unshift({
              text: parsedDEntry.form_of,
              atomic: true,
            });
          }
        } catch (err) {}
      }

      dataMap[parsedDEntry.word] = parsedDEntry;
    }

    entry.data = Object.values(dataMap);

    if (entry.data.length === 0) {
      return null;
    }

    entry.matchLen = split ? word.length : maxLen;
    return entry;
  }
}
