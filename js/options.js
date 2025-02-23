/*
 Überwort: German - English Popup Dictionary
 Copyright (C) 2025 Nghi Hua

---

 Originally based on Zhongwen 6.2.0
 Copyright (C) 2010-2019 Christian Schiller
 https://chrome.google.com/extensions/detail/kkmlkkjojmombglmlpbpapmhcaljjkde

*/

'use strict';

function loadVals() {
  const popupColor = localStorage['popupcolor'] || 'yellow';
  document.querySelector(
    `input[name="popupColor"][value="${popupColor}"]`
  ).checked = true;

  const fontSize = localStorage['fontSize'] || 'small';
  document.querySelector(
    `input[name="fontSize"][value="${fontSize}"]`
  ).checked = true;

  const grammar = localStorage['grammar'] || 'yes';
  document.querySelector('#grammar').checked = grammar !== 'no';

  const vocab = localStorage['vocab'] || 'yes';
  document.querySelector('#vocab').checked = vocab !== 'no';

  const saveToWordList = localStorage['saveToWordList'] || 'allEntries';
  document.querySelector(
    `input[name="saveToWordList"][value="${saveToWordList}"]`
  ).checked = true;
}

function setPopupColor(popupColor) {
  localStorage['popupcolor'] = popupColor;
  chrome.extension.getBackgroundPage().zhongwenOptions.css = popupColor;
}

function setOption(option, value) {
  localStorage[option] = value;
  chrome.extension.getBackgroundPage().zhongwenOptions[option] = value;
}

function setBooleanOption(option, value) {
  let yesNo = value ? 'yes' : 'no';
  setOption(option, yesNo);
}

window.addEventListener('load', () => {
  document.querySelectorAll('input[name="popupColor"]').forEach((input) => {
    input.addEventListener('change', () =>
      setPopupColor(input.getAttribute('value'))
    );
  });

  document.querySelectorAll('input[name="fontSize"]').forEach((input) => {
    input.addEventListener('change', () =>
      setOption('fontSize', input.getAttribute('value'))
    );
  });

  document
    .querySelector('#grammar')
    .addEventListener('change', (event) =>
      setBooleanOption('grammar', event.target.checked)
    );

  document
    .querySelector('#vocab')
    .addEventListener('change', (event) =>
      setBooleanOption('vocab', event.target.checked)
    );

  document.querySelectorAll('input[name="saveToWordList"]').forEach((input) => {
    input.addEventListener('change', () =>
      setOption('saveToWordList', input.getAttribute('value'))
    );
  });
});

loadVals();
