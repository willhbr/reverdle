const update_knowledge = (knowledge, word, score) => {
  for (let idx in score) {
    let letter = word[idx];
    if (score[idx] == '2') {
      knowledge.certain_positions[idx] = letter;
      knowledge.possible_letters.delete(letter);
    } else if (score[idx] == '0') {
      knowledge.banned_letters.add(letter);
    } else {
      knowledge.possible_letters.add(letter);
      knowledge.not_this_position[idx].add(letter);
    }
  }
  return knowledge;
};

const possible_words = (knowledge, words) => words.filter((word) => {
  for (let idx in knowledge.certain_positions) {
    let letter = knowledge.certain_positions[idx];
    if (letter && word[idx] != letter) {
      return false;
    }
  }
  let possible_letter_count = 0;
  for (let idx in word) {
    let letter = word[idx];
    if (knowledge.certain_positions[idx] != letter) {
      if (!knowledge.possible_letters.has(letter)) {
        if (knowledge.banned_letters.has(letter)) {
          return false;
        }
      }
    }
    if (knowledge.not_this_position[idx].has(letter)) {
      return false;
    }
    if (knowledge.possible_letters.has(letter)) {
      possible_letter_count += 1;
    }
  }
  
  if (possible_letter_count < knowledge.possible_letters.size) {
    return false;
  }

  return true;
});

const is_valid = (word) => window.GOOD_WORD_SET.has(word) || window.ALL_WORDS.has(word);

const emojify = (pattern) => {
  let res = '';
  for (let c of pattern) {
    if (c == '2') {
      res += '&#x1F7E9;'
    } else if (c == '1') {
      res += '&#x1F7E8;'
    } else if (c == '0') {
      res += '&#x2B1B;'
    }
  }
  return res;
}

const grade = (word, target) => {
  word = word.toLowerCase()
  target = target.toLowerCase()
  let result = '';
  let ones = target;
  for (const i in target) {
    if (word[i] == target[i]) {
      result += '2'; 
    } else {
      let idx = ones.indexOf(word[i]);
      if (idx == -1) {
        result += '0';
      } else {
        ones = ones.slice(0, idx) + ones.slice(idx + 1);
        result += '1';
      }
    }
  }
  return result;
}

const word_matches = (pattern, word, target) => grade(word, target) == pattern;

let x = 0;
let TODAY = new Date();

const random = (size) => {
  x += TODAY.getDate();
  let y = x + TODAY.getFullYear() * 365;
  y += TODAY.getMonth() * 31;
  y += TODAY.getDate();
  return y % size;
};

const generate = (target) => {
  let words = GOOD_WORDS;
  if (!target) {
    target = words[random(words.length)];
  }

  let knowledge = {
    banned_letters: new Set(),
    certain_positions: [null, null, null, null, null],
    possible_letters: new Set(),
    not_this_position: [new Set(), new Set(), new Set(), new Set(), new Set()],
  };

  let guess = ''
  let g = '';
  let patterns = [];

  let i = 0;
  while (g != '22222') {
    i += 1;
    if (i > 100) {
      break;
    }
    words = possible_words(knowledge, words);
    guess = words.splice(random(words.length), 1)[0];
    if (!guess) {
      throw "oh no it failed";
    }
    g = grade(guess, target);
    patterns.push(g);
    knowledge = update_knowledge(knowledge, guess, g);
  }

  return ({
    patterns: patterns,
    target: target,
  });
};

const check_input = (target, field) => {
  let idx = field.dataset.idx;
  let pattern = field.dataset.pattern;
  let word = field.value;
  let result_field = $('#result-' + idx);
  localStorage['guess-' + idx] = word;
  localStorage['guessed-at'] = new Date().toDateString();
  if (word.length != 5) {
    result_field.innerHTML = QNS + '&#x2754;';
    return;
  }
  let g = grade(word, target);
  if (!is_valid(word)) {
    field.classList.add('bad-word');
    field.classList.remove('correct');
    field.classList.remove('incorrect');
    field.classList.remove('duplicate');
    result_field.innerHTML = QNS + BAD_WORD;
  } else if (Array.from(
    $$('.guess-field')).map(f => f.dataset.idx == idx ? '' : f.value).includes(word)) {
    $$('.guess-field').forEach(f => {
      if (f.value == word && f.dataset.idx != idx) {
        $('#result-' + f.dataset.idx).innerHTML = QNS + DUPLICATE;
      }
    });
    field.classList.remove('correct');
    field.classList.remove('bad-word');
    field.classList.remove('incorrect');
    field.classList.add('duplicate');
    result_field.innerHTML = QNS + DUPLICATE;
  } else if (g == pattern) {
    field.classList.add('correct');
    field.classList.remove('bad-word');
    field.classList.remove('incorrect');
    field.classList.remove('duplicate');
    result_field.innerHTML = emojify(g) + SUCCESS;
  } else {
    field.classList.remove('correct');
    field.classList.remove('bad-word');
    field.classList.add('incorrect');
    field.classList.remove('duplicate');
    result_field.innerHTML = emojify(g) + FAILURE;
  }
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const QNS = '&#x2754;&#x2754;&#x2754;&#x2754;&#x2754;';

const SUCCESS = '&#x2705;';
const FAILURE = '&#x274C;';
const BAD_WORD = '&#x1F6AB;';
const DUPLICATE = '&#x32;&#xFE0F;&#x20E3;';

const main = () => {
  let table = $('#the-table');
  let context = generate();

  context.patterns.forEach((pattern, idx, list) => {
    let emojis = emojify(pattern);
    let tr = `<tr><td class="emo">${emojis}</td>`;
    if (idx == list.length - 1) {
      tr += `<td class="word">${context.target}</td>`;
    } else {
      tr += `<td class="input"><input type="text" class="guess-field"
                  data-idx="${idx}" data-pattern="${pattern}"/></td>`;
      tr += `<td class="result" id="result-${idx}">${QNS}&#x2754;</td>`
    }   
    table.innerHTML += tr + '</tr>';
  });
  let ignore_storage = localStorage['guessed-at'] != new Date().toDateString();
  $$('.guess-field').forEach(field => {
    let idx = field.dataset.idx;
    let stored = localStorage['guess-' + idx];
    if (stored && !ignore_storage) {
      field.value = stored;
      check_input(context.target, field);
    }
    field.addEventListener('keyup', () => {
      check_input(context.target, field);
    });
  });
};

window.addEventListener('load', main);
