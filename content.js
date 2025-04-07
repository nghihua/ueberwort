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

/* global globalThis */

'use strict';

let config;

let savedTarget;

let savedRangeNode;

let savedRangeOffset;

let selText;

let clientX;

let clientY;

let selStartDelta;

let selStartIncrement;

let popX = 0;

let popY = 0;

let timer;

let altView = 0;

let savedSearchResults = [];

let savedSelStartOffset = 0;

let savedSelEndList = [];

// regular expression for zero-width non-joiner U+200C &zwnj;
let zwnj = /\u200c/g;

function enableTab() {
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('keydown', onKeyDown);
}

function disableTab() {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('keydown', onKeyDown);

  let popup = document.getElementById('ueberwort-window');
  if (popup) {
    popup.parentNode.removeChild(popup);
  }

  clearHighlight();
}

function onKeyDown(keyDown) {
  if (keyDown.ctrlKey || keyDown.metaKey) {
    return;
  }

  if (keyDown.keyCode === 27) {
    // esc key pressed
    hidePopup();
    return;
  }

  if (keyDown.altKey && keyDown.keyCode === 87) {
    // Alt + w
    chrome.runtime.sendMessage({
      type: 'open',
      tabType: 'wordlist',
      url: '/wordlist.html',
    });
    return;
  }

  if (!isVisible()) {
    return;
  }

  switch (keyDown.keyCode) {
    case 65: // 'a'
      altView = (altView + 1) % 3;
      triggerSearch();
      break;

    case 82: // 'r'
      {
        let entries = [];
        for (let j = 0; j < savedSearchResults.length; j++) {
          let entry = {
            simplified: savedSearchResults[j][0],
            traditional: savedSearchResults[j][1],
            pinyin: savedSearchResults[j][2],
            definition: savedSearchResults[j][3],
          };
          entries.push(entry);
        }

        chrome.runtime.sendMessage({
          type: 'add',
          entries: entries,
        });

        showPopup(
          'Added to word list.<p>Press Alt+W to open word list.',
          null,
          -1,
          -1
        );
      }
      break;

    case 84: // 't'
      {
        let sel = encodeURIComponent(window.getSelection().toString());

        let tatoeba =
          'https://tatoeba.org/eng/sentences/search?from=deu&to=eng&query=' +
          sel;

        chrome.runtime.sendMessage({
          type: 'open',
          tabType: 'tatoeba',
          url: tatoeba,
        });
      }
      break;

    case 86: // 'v'
      if (config.vocab !== 'no' && savedSearchResults.vocab) {
        let sel = encodeURIComponent(window.getSelection().toString());

        // https://resources.allsetlearning.com/chinese/vocabulary/%E4%B8%AA
        let allset =
          'https://resources.allsetlearning.com/chinese/vocabulary/' + sel;

        chrome.runtime.sendMessage({
          type: 'open',
          tabType: 'vocab',
          url: allset,
        });
      }
      break;

    case 88: // 'x'
      altView = 0;
      popY -= 20;
      triggerSearch();
      break;

    case 89: // 'y'
      altView = 0;
      popY += 20;
      triggerSearch();
      break;

    case 49: // '1'
      if (keyDown.altKey) {
        let sel = encodeURIComponent(window.getSelection().toString());

        let duden = 'https://www.duden.de/suchen/dudenonline/' + sel;

        chrome.runtime.sendMessage({
          type: 'open',
          tabType: 'duden',
          url: duden,
        });
      }
      break;

    case 50: // '2'
      if (keyDown.altKey) {
        let sel = encodeURIComponent(window.getSelection().toString());

        var forvo = 'https://forvo.com/search/' + sel + '/de/';

        chrome.runtime.sendMessage({
          type: 'open',
          tabType: 'forvo',
          url: forvo,
        });
      }
      break;

    case 51: // '3'
      if (keyDown.altKey) {
        let sel = encodeURIComponent(window.getSelection().toString());

        let dictcc = 'https://www.dict.cc/?s=' + sel;

        chrome.runtime.sendMessage({
          type: 'open',
          tabType: 'dictcc',
          url: dictcc,
        });
      }
      break;

    case 52: // '4'
      if (keyDown.altKey) {
        let sel = encodeURIComponent(window.getSelection().toString());

        let cambridge =
          'https://dictionary.cambridge.org/spellcheck/german-english/?q=' +
          sel;

        chrome.runtime.sendMessage({
          type: 'open',
          tabType: 'cambridge',
          url: cambridge,
        });
      }
      break;

    case 53: // '5'
      if (keyDown.altKey) {
        let sel = encodeURIComponent(window.getSelection().toString());

        let google = `https://translate.google.com/?sl=de&tl=en&text=${sel}&op=translate`;

        chrome.runtime.sendMessage({
          type: 'open',
          tabType: 'google',
          url: google,
        });
      }
      break;

    case 54: // '6'
      if (keyDown.altKey) {
        let sel = encodeURIComponent(window.getSelection().toString());

        let reverso =
          'https://context.reverso.net/translation/german-english/' + sel;

        chrome.runtime.sendMessage({
          type: 'open',
          tabType: 'reverso',
          url: reverso,
        });
      }
      break;

    case 55: // '7'
      if (keyDown.altKey) {
        let sel = encodeURIComponent(window.getSelection().toString());
        // https://www.moedict.tw/~%E4%B8%AD%E6%96%87
        let pons = 'https://en.pons.com/translate-2/german-english/' + sel;

        chrome.runtime.sendMessage({
          type: 'open',
          tabType: 'pons',
          url: pons,
        });
      }
      break;

    default:
      return;
  }
}

function onMouseMove(mouseMove) {
  if (
    mouseMove.target.nodeName === 'TEXTAREA' ||
    mouseMove.target.nodeName === 'INPUT' ||
    mouseMove.target.nodeName === 'DIV'
  ) {
    let div = document.getElementById('ueberwortDiv');

    if (mouseMove.altKey) {
      if (
        !div &&
        (mouseMove.target.nodeName === 'TEXTAREA' ||
          mouseMove.target.nodeName === 'INPUT')
      ) {
        div = makeDiv(mouseMove.target);
        document.body.appendChild(div);
        div.scrollTop = mouseMove.target.scrollTop;
        div.scrollLeft = mouseMove.target.scrollLeft;
      }
    } else {
      if (div) {
        document.body.removeChild(div);
      }
    }
  }

  if (clientX && clientY) {
    if (mouseMove.clientX === clientX && mouseMove.clientY === clientY) {
      return;
    }
  }
  clientX = mouseMove.clientX;
  clientY = mouseMove.clientY;

  let range;
  let rangeNode;
  let rangeOffset;

  // Handle Chrome and Firefox
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(mouseMove.clientX, mouseMove.clientY);
    if (range === null) {
      return;
    }
    rangeNode = range.startContainer;
    rangeOffset = range.startOffset;
  } else if (document.caretPositionFromPoint) {
    range = document.caretPositionFromPoint(
      mouseMove.clientX,
      mouseMove.clientY
    );
    if (range === null) {
      return;
    }
    rangeNode = range.offsetNode;
    rangeOffset = range.offset;
  }

  if (mouseMove.target === savedTarget) {
    if (rangeNode === savedRangeNode && rangeOffset === savedRangeOffset) {
      return;
    }
  }

  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  if (rangeNode.data && rangeOffset === rangeNode.data.length) {
    rangeNode = findNextTextNode(rangeNode.parentNode, rangeNode);
    rangeOffset = 0;
  }

  if (!rangeNode || rangeNode.parentNode !== mouseMove.target) {
    rangeNode = null;
    rangeOffset = -1;
  }

  savedTarget = mouseMove.target;
  savedRangeNode = rangeNode;
  savedRangeOffset = rangeOffset;

  selStartDelta = 0;
  selStartIncrement = 1;

  if (rangeNode && rangeNode.data && rangeOffset < rangeNode.data.length) {
    popX = mouseMove.clientX;
    popY = mouseMove.clientY;
    timer = setTimeout(() => triggerSearch(), 50);
    return;
  }

  // Don't close just because we moved from a valid pop-up slightly over to a place with nothing.
  let dx = popX - mouseMove.clientX;
  let dy = popY - mouseMove.clientY;
  let distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > 4) {
    clearHighlight();
    hidePopup();
  }
}

function triggerSearch() {
  let rangeNode = savedRangeNode;
  let selStartOffset = savedRangeOffset + selStartDelta;

  selStartIncrement = 1;

  if (!rangeNode) {
    clearHighlight();
    hidePopup();
    return 1;
  }

  if (selStartOffset < 0 || rangeNode.data.length <= selStartOffset) {
    clearHighlight();
    hidePopup();
    return 2;
  }

  const beforeCursor = rangeNode.textContent
    .slice(0, selStartOffset)
    .split(/\s+/)
    .pop();
  const afterCursor = rangeNode.textContent
    .slice(selStartOffset)
    .split(/\s+/)
    .shift();
  const hoveredWord = beforeCursor + afterCursor;

  let selEndList = [];
  let originalText = getText(
    rangeNode,
    selStartOffset - beforeCursor.length,
    selEndList,
    30 /*maxlength*/
  );

  // Workaround for Google Docs: remove zero-width non-joiner &zwnj;
  let text = originalText.replace(zwnj, '');

  savedSelStartOffset = selStartOffset - beforeCursor.length;
  savedSelEndList = selEndList;

  if (!hoveredWord.trim()) {
    clearHighlight();
    hidePopup();
    return 3;
  }

  chrome.runtime.sendMessage(
    {
      type: 'search',
      text: hoveredWord,
      originalText: rangeNode.textContent,
    },
    processSearchResult
  );

  return 0;
}

function processSearchResult(result) {
  let selStartOffset = savedSelStartOffset;
  let selEndList = savedSelEndList;

  if (!result) {
    hidePopup();
    clearHighlight();
    return;
  }

  let highlightLength;
  let index = 0;
  for (let i = 0; i < result.matchLen; i++) {
    // Google Docs workaround: determine the correct highlight length
    while (result.originalText[index] === '\u200c') {
      index++;
    }
    index++;
  }
  highlightLength = index;

  selStartIncrement = result.matchLen;
  selStartDelta = selStartOffset - savedRangeOffset;

  let rangeNode = savedRangeNode;
  // don't try to highlight form elements
  if (!('form' in savedTarget)) {
    let doc = rangeNode.ownerDocument;
    if (!doc) {
      clearHighlight();
      hidePopup();
      return;
    }
    highlightMatch(doc, rangeNode, selStartOffset, highlightLength, selEndList);
  }

  showPopup(makeHtml(result), savedTarget, popX, popY, false);
}

// modifies selEndList as a side-effect
function getText(startNode, offset, selEndList, maxLength) {
  let text = '';
  let endIndex;

  if (startNode.nodeType !== Node.TEXT_NODE) {
    return '';
  }

  endIndex = Math.min(startNode.data.length, offset + maxLength);
  text += startNode.data.substring(offset, endIndex);
  selEndList.push({
    node: startNode,
    offset: endIndex,
  });

  let nextNode = startNode;
  while (
    text.length < maxLength &&
    (nextNode = findNextTextNode(nextNode.parentNode, nextNode)) !== null
  ) {
    text += getTextFromSingleNode(
      nextNode,
      selEndList,
      maxLength - text.length
    );
  }

  return text;
}

// modifies selEndList as a side-effect
function getTextFromSingleNode(node, selEndList, maxLength) {
  let endIndex;

  if (node.nodeName === '#text') {
    endIndex = Math.min(maxLength, node.data.length);
    selEndList.push({
      node: node,
      offset: endIndex,
    });
    return node.data.substring(0, endIndex);
  } else {
    return '';
  }
}

function showPopup(html, elem, x, y, looseWidth) {
  if (!x || !y) {
    x = y = 0;
  }

  let popup = document.getElementById('ueberwort-window');

  if (!popup) {
    popup = document.createElement('div');
    popup.setAttribute('id', 'ueberwort-window');
    document.documentElement.appendChild(popup);
  }

  popup.style.width = 'auto';
  popup.style.height = 'auto';
  popup.style.maxWidth = looseWidth ? '' : '600px';
  popup.className = `background-${config.popupcolor}`;

  $(popup).html(html);

  if (elem) {
    popup.style.top = '-1000px';
    popup.style.left = '0px';
    popup.style.display = '';

    let pW = popup.offsetWidth;
    let pH = popup.offsetHeight;

    if (pW <= 0) {
      pW = 200;
    }
    if (pH <= 0) {
      pH = 0;
      let j = 0;
      while ((j = html.indexOf('<br/>', j)) !== -1) {
        j += 5;
        pH += 22;
      }
      pH += 25;
    }

    if (altView === 1) {
      x = window.scrollX;
      y = window.scrollY;
    } else if (altView === 2) {
      x = window.innerWidth - (pW + 20) + window.scrollX;
      y = window.innerHeight - (pH + 20) + window.scrollY;
    } else if (elem instanceof window.HTMLOptionElement) {
      x = 0;
      y = 0;

      let p = elem;
      while (p) {
        x += p.offsetLeft;
        y += p.offsetTop;
        p = p.offsetParent;
      }

      if (elem.offsetTop > elem.parentNode.clientHeight) {
        y -= elem.offsetTop;
      }

      if (x + popup.offsetWidth > window.innerWidth) {
        // too much to the right, go left
        x -= popup.offsetWidth + 5;
        if (x < 0) {
          x = 0;
        }
      } else {
        // use SELECT's width
        x += elem.parentNode.offsetWidth + 5;
      }
    } else {
      // go left if necessary
      if (x + pW > window.innerWidth - 20) {
        x = window.innerWidth - pW - 20;
        if (x < 0) {
          x = 0;
        }
      }

      // below the mouse
      let v = 25;

      // go up if necessary
      if (y + v + pH > window.innerHeight) {
        let t = y - pH - 30;
        if (t >= 0) {
          y = t;
        }
      } else {
        y += v;
      }

      x += window.scrollX;
      y += window.scrollY;
    }
  } else {
    x += window.scrollX;
    y += window.scrollY;
  }

  // (-1, -1) indicates: leave position unchanged
  if (x !== -1 && y !== -1) {
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    popup.style.display = '';
  }
}

function hidePopup() {
  let popup = document.getElementById('ueberwort-window');
  if (popup) {
    popup.style.display = 'none';
    popup.textContent = '';
  }
}

function highlightMatch(
  doc,
  rangeStartNode,
  rangeStartOffset,
  matchLen,
  selEndList
) {
  if (!selEndList || selEndList.length === 0) return;

  let selEnd;
  let offset = rangeStartOffset + matchLen;

  for (let i = 0, len = selEndList.length; i < len; i++) {
    selEnd = selEndList[i];
    if (offset <= selEnd.offset) {
      break;
    }
    offset -= selEnd.offset;
  }

  let range = doc.createRange();
  range.setStart(rangeStartNode, rangeStartOffset);
  range.setEnd(selEnd.node, offset);

  let sel = window.getSelection();
  if (!sel.isCollapsed && selText !== sel.toString()) return;
  sel.empty();
  sel.addRange(range);
  selText = sel.toString();
}

function clearHighlight() {
  if (selText === null) {
    return;
  }

  let selection = window.getSelection();
  if (selection.isCollapsed || selText === selection.toString()) {
    selection.empty();
  }
  selText = null;
}

function isVisible() {
  let popup = document.getElementById('ueberwort-window');
  return popup && popup.style.display !== 'none';
}

function makeDiv(input) {
  let div = document.createElement('div');

  div.id = 'ueberwortDiv';

  let text;
  if (input.value) {
    text = input.value;
  } else {
    text = '';
  }
  div.innerText = text;

  div.style.cssText = window.getComputedStyle(input, '').cssText;
  div.scrollTop = input.scrollTop;
  div.scrollLeft = input.scrollLeft;
  div.style.position = 'absolute';
  div.style.zIndex = 7000;
  $(div).offset({
    top: $(input).offset().top,
    left: $(input).offset().left,
  });

  return div;
}

function findNextTextNode(root, previous) {
  if (root === null) {
    return null;
  }
  let nodeIterator = document.createNodeIterator(
    root,
    NodeFilter.SHOW_TEXT,
    null
  );
  let node = nodeIterator.nextNode();
  while (node !== previous) {
    node = nodeIterator.nextNode();
    if (node === null) {
      return findNextTextNode(root.parentNode, previous);
    }
  }
  let result = nodeIterator.nextNode();
  if (result !== null) {
    return result;
  } else {
    return findNextTextNode(root.parentNode, previous);
  }
}

function copyToClipboard(data) {
  chrome.runtime.sendMessage({
    type: 'copy',
    data: data,
  });

  showPopup('Copied to clipboard', null, -1, -1);
}

function makeHtml(result) {
  let html = '';
  let texts = [];

  if (result === null) return '';

  for (let i = 0; i < result.data.length; ++i) {
    const parsedResult = result.data[i];

    // Word
    const wordClass = 'w-word';
    html +=
      '<span class="' + wordClass + '">' + parsedResult.word + '</span>&nbsp;';

    // Hyphenation
    const hyphenationContainer = document.createElement('div');
    if (parsedResult.hyphenation) {
      hyphenationContainer.innerText = `/${parsedResult.hyphenation}/`;
    }
    html += hyphenationContainer.outerHTML;

    // Meaning
    const meaningContainer = document.createElement('ul');
    parsedResult.meaning.split('*').forEach((meaning) => {
      if (!meaning.trim()) return;
      const li = document.createElement('li');
      li.innerText = meaning;
      li.classList.add('w-meaning');
      meaningContainer.appendChild(li);
    });
    html += meaningContainer.outerHTML;

    // Synonyms
    if (parsedResult.synonyms) {
      const synonymsContainer = document.createElement('div');
      synonymsContainer.innerHTML += '<b>Synonyms: </b>';
      parsedResult.synonyms?.split('*').forEach((synonym) => {
        if (!synonym.trim()) return;
        const span = document.createElement('span');
        span.innerText = synonym + '   |   ';
        span.classList.add('w-synonym');
        synonymsContainer.appendChild(span);
      });
      html += synonymsContainer.outerHTML;
    }
  }
  if (result.more) {
    html += '&hellip;<br/>';
  }

  savedSearchResults = texts;

  return html;
}

let tones = {
  1: '&#772;',
  2: '&#769;',
  3: '&#780;',
  4: '&#768;',
  5: '',
};

let utones = {
  1: '\u0304',
  2: '\u0301',
  3: '\u030C',
  4: '\u0300',
  5: '',
};

function parse(s) {
  return s.match(/([^AEIOU:aeiou]*)([AEIOUaeiou:]+)([^aeiou:]*)([1-5])/);
}

let miniHelp = `
    <span style="font-weight: bold;">Überwort Chinese-English Dictionary</span><br><br>
    <p>Keyboard shortcuts:<p>
    <table style="margin: 10px;" cellspacing=5 cellpadding=5>
    <tr><td><b>n&nbsp;:</b></td><td>&nbsp;Next word</td></tr>
    <tr><td><b>b&nbsp;:</b></td><td>&nbsp;Previous character</td></tr>
    <tr><td><b>m&nbsp;:</b></td><td>&nbsp;Next character</td></tr>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    <tr><td><b>a&nbsp;:</b></td><td>&nbsp;Alternate pop-up location</td></tr>
    <tr><td><b>y&nbsp;:</b></td><td>&nbsp;Move pop-up location down</td></tr>
    <tr><td><b>x&nbsp;:</b></td><td>&nbsp;Move pop-up location up</td></tr>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    <tr><td><b>c&nbsp;:</b></td><td>&nbsp;Copy translation to clipboard</td></tr>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    <tr><td><b>r&nbsp;:</b></td><td>&nbsp;Remember word by adding it to the built-in word list</td></tr>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    <tr><td><b>Alt w&nbsp;:</b></td><td>&nbsp;Show the built-in word list in a new tab</td></tr>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    </table>
    Look up selected text in online resources:
    <table style="margin: 10px;" cellspacing=5 cellpadding=5>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    <tr><td><b>Alt + 1 :</b></td><td>&nbsp;LINE Dict</td></tr>
    <tr><td><b>Alt + 2 :</b></td><td>&nbsp;Forvo</td></tr>
    <tr><td><b>Alt + 3 :</b></td><td>&nbsp;Dict.cn</td></tr>
    <tr><td><b>Alt + 4&nbsp;:</b></td><td>&nbsp;iCIBA</td></tr>
    <tr><td><b>Alt + 5&nbsp;:</b></td><td>&nbsp;MDBG</td></tr>
    <tr><td><b>Alt + 6&nbsp;:</b></td><td>&nbsp;Reverso</td></tr>
    <tr><td><b>Alt + 7&nbsp;:</b></td><td>&nbsp;MoE Dict</td></tr>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    <tr><td><b>t&nbsp;:</b></td><td>&nbsp;Tatoeba</td></tr>
    </table>`;

// event listener
chrome.runtime.onMessage.addListener(function (request) {
  switch (request.type) {
    case 'enable':
      enableTab();
      chrome.storage.sync.get().then((storageItems) => {
        config = { popupcolor: 'yellow', fontSize: 'small', ...storageItems };
      });
      break;
    case 'disable':
      disableTab();
      break;
    case 'showPopup':
      if (!request.isHelp || window === window.top) {
        showPopup(request.text);
      }
      break;
    case 'showHelp':
      showPopup(miniHelp);
      break;
    default:
  }
});
