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

const remoji = text => text.replace(/&#x[a-f0-9]+;/gi, r => ({
  '&#x2b1b;': '⬛',
  '&#x1f7e8;': '🟨',
  '&#x1f7e9;': '🟩',
  '&#x2705;': '✅',
}[r.toLowerCase()] || r));

const grade = (word, target) => {
  word = word.toLowerCase()
  target = target.toLowerCase()
  let result = [];
  let ones = target;
  for (const i in target) {
    if (word[i] == target[i]) {
      let idx = ones.indexOf(word[i]);
      ones = ones.slice(0, idx) + ones.slice(idx + 1);
      result[i] = '2';
    }
  }
  for (const i in target) {
    let idx = ones.indexOf(word[i]);
    if (idx == -1) {
      result[i] = result[i] || '0';
    } else {
      ones = ones.slice(0, idx) + ones.slice(idx + 1);
      result[i] = '1';
    }
  }
  return result.join('');
}

const word_matches = (pattern, word, target) => grade(word, target) == pattern;

let x = 0;
let TODAY = new Date();
const REVERDLE_NUMBER = Math.floor(
  (TODAY.getTime() - new Date(2022, 2, 7).getTime()) / (1000 * 60 * 60 * 24));

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
  let answers = [];

  let i = 0;
  while (g != '22222') {
    i += 1;
    if (i > 8) {
      break;
    }
    words = possible_words(knowledge, words);
    guess = words.splice(random(words.length), 1)[0];
    if (!guess) {
      throw "oh no it failed";
    }
    g = grade(guess, target);
    patterns.push(g);
    answers.push(guess);
    knowledge = update_knowledge(knowledge, guess, g);
  }

  return ({
    patterns: patterns,
    target: target,
    answers: answers,
  });
};

const record_stats = (context) => {
  let stats = null;
  try {
    stats = JSON.parse(localStorage['stats']);
  } catch (err) {
    console.log(err);
    stats = {
      streak: 0,
      last_completed: '',
      games_completed: 0,
      longest_streak: 0,
    };
  }

  if (stats.last_completed) {
    if (TODAY.toDateString() == new Date(stats.last_completed).toDateString()) {
      return stats;
    }
  }

  stats.games_completed += 1;

  let yesterday = new Date(TODAY.getTime() - (1000 * 60 * 60 * 24));
  if (yesterday.toDateString() == new Date(stats.last_completed).toDateString()) {
    stats.streak += 1;
  } else {
    stats.streak = 1;
  }
  stats.longest_streak = Math.max(stats.streak, stats.longest_streak);
  stats.last_completed = TODAY.toDateString();

  localStorage['stats'] = JSON.stringify(stats);
  return stats;
};

const finished = (context) => {
  let stats = record_stats(context);
  let output = $('#results-page');
  let res = output.querySelector('#result');
  let num_field = output.querySelector('#reverdle-num');
  num_field.innerText = REVERDLE_NUMBER;

  let out = '';

  context.patterns.forEach(pattern => {
    if (pattern == '22222') {
      out += context.target.toUpperCase() + '<br>';
    } else {
      out += emojify(pattern) + SUCCESS + '<br>';
    }
  });

  res.innerHTML = out + '<a href="https://willhbr.net/reverdle">willhbr.net/reverdle</a>';;

  $('#stats').innerHTML = `
  <b>Streak:</b> ${stats.streak}<br>
  <b>Longest streak:</b> ${stats.longest_streak}<br>
  <b>Games played:</b> ${stats.games_completed}
  `;

  let share = output.querySelector('button');
  let share_text = remoji(
    'Reverdle #' + REVERDLE_NUMBER + '\n'
    + out + '\nwillhbr.net/reverdle').replace(/<br>/gi, '\n');
  if (window.isSecureContext) {
    share.onclick = () => {
      try {
        navigator.clipboard.writeText(share_text);
        share.innerText = 'Copied';
        setTimeout(() => { share.innerText = 'Share'; }, 3000);
      } catch {
        share.innerText = 'failed';
      }
    };
  } else {
    console.log(share_text);
    share.style.display = 'none';
  }
  output.style.display = 'block';
};

const check_input = (target, field) => {
  let idx = field.dataset.idx;
  let pattern = field.dataset.pattern;
  let word = field.value.toLowerCase();
  let result_field = $('#result-' + idx);
  let mark_field = $('#mark-' + idx);
  localStorage['guess-' + idx] = word;
  localStorage['guessed-at'] = TODAY.toDateString();
  if (word.length != 5) {
    result_field.innerHTML = QNS;
    mark_field.innerHTML = '&#x2754;';
    return;
  }
  let g = grade(word, target);
  let success = false;
  if (!is_valid(word)) {
    field.classList.add('bad-word');
    field.classList.remove('correct');
    field.classList.remove('incorrect');
    field.classList.remove('duplicate');
    result_field.innerHTML = QNS;
    mark_field.innerHTML = BAD_WORD;
  } else if (Array.from(
    $$('.guess-field')).map(f => f.dataset.idx == idx ? '' : f.value.toLowerCase()).includes(word)) {
    $$('.guess-field').forEach(f => {
      if (f.value == word && f.dataset.idx != idx) {
        $('#result-' + f.dataset.idx).innerHTML = QNS;
        $('#mark-' + f.dataset.idx).innerHTML = DUPLICATE;
      }
    });
    field.classList.remove('correct');
    field.classList.remove('bad-word');
    field.classList.remove('incorrect');
    field.classList.add('duplicate');
    result_field.innerHTML = QNS;
    mark_field.innerHTML = DUPLICATE;
  } else if (g == pattern) {
    success = true;
    field.classList.add('correct');
    field.classList.remove('bad-word');
    field.classList.remove('incorrect');
    field.classList.remove('duplicate');
    result_field.innerHTML = emojify(g);
    mark_field.innerHTML = SUCCESS;
  } else {
    field.classList.remove('correct');
    field.classList.remove('bad-word');
    field.classList.add('incorrect');
    field.classList.remove('duplicate');
    result_field.innerHTML = emojify(g);
    mark_field.innerHTML = FAILURE;
  }
  field.disabled = success;
  return success;
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const QNS = '&#x2B1C;&#x2B1C;&#x2B1C;&#x2B1C;&#x2B1C;';

const SUCCESS = '&#x2705;';
const FAILURE = '&#x274C;';
const BAD_WORD = '&#x1F6AB;';
const DUPLICATE = '&#x32;&#xFE0F;&#x20E3;';

const main = () => {
  let table = $('#game');
  let ignore_storage = localStorage['guessed-at'] != TODAY.toDateString();
  let context = null;
  if (!ignore_storage) {
    try {
      context = JSON.parse(localStorage['context']);
    } catch (error) {
      console.log(error);
    }
  }
  if (!context) {
    context = generate();
    localStorage['context'] = JSON.stringify(context);
  }

  game.innerHTML = '';
  context.patterns.forEach((pattern, idx, list) => {
    let answer = context.answers[idx];
    let emojis = emojify(pattern);
    let row = `<div class="row"><div class="emo">${emojis}</div>`;
    if (idx == list.length - 1) {
      row += `<div class="word">${context.target}</div>`;
    } else {
      row += `<div class="input"><input type="text" class="guess-field"
                  data-answer="${answer}"
                  data-idx="${idx}" data-pattern="${pattern}"/>
               <span id="mark-${idx}">&#x2754;</span></div>`;
      row += `<div class="result" id="result-${idx}">${QNS}</div>`
    }
    game.innerHTML += row + '</div>';
  });

  let results = new Array(context.patterns.length - 1);
  $$('.guess-field').forEach(field => {
    let idx = field.dataset.idx;
    results[idx] = false;
    let stored = localStorage['guess-' + idx];
    if (stored && !ignore_storage) {
      field.value = stored;
      results[idx] = check_input(context.target, field);
    }
    field.addEventListener('keyup', () => {
      results[idx] = check_input(context.target, field);
      if (results.reduce((a, x) => a && x, true)) {
        finished(context);
      }
    });
  });
  if (results.reduce((a, x) => a && x, true)) {
    finished(context);
  }
};

window.addEventListener('load', main);
