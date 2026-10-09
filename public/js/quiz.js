const SN_QUESTION_BANKS = {
 'web-dev': { title: 'Web Development Basics', qs: [
  ['Which HTML tag defines the largest heading?', ['<h6>', '<h1>', '<head>', '<header>'], 1],
  ['Which CSS property changes the text colour?', ['font-color', 'text-style', 'color', 'fg'], 2],
  ['Which keyword declares a block-scoped variable in JavaScript?', ['var', 'let', 'int', 'dim'], 1],
  ['What does the DOM stand for?', ['Document Object Model', 'Data Output Mode', 'Digital Order Map', 'Document Oriented Markup'], 0],
  ['Which tag is used to link an external CSS file?', ['<style>', '<script>', '<link>', '<css>'], 2]] },
 'dbms': { title: 'DBMS Fundamentals', qs: [
  ['Which SQL command retrieves data from a table?', ['GET', 'SELECT', 'FETCH', 'OPEN'], 1],
  ['A primary key must be...', ['Duplicate', 'Unique and not null', 'Text only', 'Optional'], 1],
  ['Which normal form removes transitive dependency?', ['1NF', '2NF', '3NF', 'None'], 2],
  ['Which JOIN returns only matching rows from both tables?', ['LEFT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN'], 1],
  ['Which command removes a table entirely?', ['DELETE', 'REMOVE', 'TRUNCATE', 'DROP'], 3]] },
 'networks': { title: 'Computer Networks', qs: [
  ['How many layers does the OSI model have?', ['4', '5', '7', '9'], 2],
  ['Which protocol is connection-oriented?', ['UDP', 'TCP', 'IP', 'ICMP'], 1],
  ['DNS is used to...', ['Encrypt data', 'Translate domain names to IP addresses', 'Assign MAC addresses', 'Route packets'], 1],
  ['Which device forwards packets between networks?', ['Hub', 'Switch', 'Router', 'Repeater'], 2],
  ['Which layer handles end-to-end delivery (TCP/UDP)?', ['Network', 'Transport', 'Session', 'Data Link'], 1]] },
 'oop': { title: 'OOP with C++ / Java', qs: [
  ['Bundling data and methods together is called...', ['Inheritance', 'Encapsulation', 'Polymorphism', 'Compilation'], 1],
  ['Which pillar lets a class reuse another class\'s behaviour?', ['Inheritance', 'Abstraction', 'Overloading', 'Casting'], 0],
  ['A constructor is called when...', ['An object is created', 'An object is deleted', 'A class is compiled', 'A method returns'], 0],
  ['Method overloading is an example of...', ['Runtime polymorphism', 'Compile-time polymorphism', 'Encapsulation', 'Inheritance'], 1],
  ['Hiding implementation details and showing only essentials is...', ['Abstraction', 'Inheritance', 'Binding', 'Looping'], 0]] }
};
(function () {
  const key = new URLSearchParams(location.search).get('subject'), bank = SN_QUESTION_BANKS[key] || SN_QUESTION_BANKS['web-dev'];
  const qs = bank.qs, root = $('quizRoot'); let i = 0, score = 0; const wrong = [];
  $('quizTitle').textContent = bank.title;
  function show() {
    $('quizCount').textContent = 'Question ' + (i + 1) + ' of ' + qs.length;
    $('quizProgressBar').style.width = (i / qs.length * 100) + '%';
    const q = qs[i];
    root.innerHTML = '<h2 class="quiz-q">' + esc(q[0]) + '</h2>' + q[1].map((o, n) => '<button type="button" class="quiz-opt" data-n="' + n + '">' + esc(o) + '</button>').join('') + '<div class="quiz-next" id="qNext"></div>';
    root.querySelectorAll('.quiz-opt').forEach(b => b.onclick = () => {
      const n = +b.dataset.n; root.querySelectorAll('.quiz-opt').forEach(x => { x.disabled = true; if (+x.dataset.n === q[2]) x.classList.add('right'); });
      if (n === q[2]) score++; else { b.classList.add('wrong'); wrong.push(q); }
      $('qNext').innerHTML = '<button type="button" class="btn btn-amber" id="nextBtn">' + (i + 1 < qs.length ? 'Next question →' : 'See result') + '</button>';
      $('nextBtn').onclick = () => { i++; i < qs.length ? show() : done(); };
    });
  }
  function done() {
    $('quizProgressBar').style.width = '100%'; $('quizCount').textContent = 'Test complete';
    root.innerHTML = '<h2 class="quiz-q">You scored ' + score + ' / ' + qs.length + '</h2><p class="muted">' + (score === qs.length ? 'Perfect — great work!' : score >= 3 ? 'Good job — review the ones below.' : 'Keep practising — revise the topics below.') + '</p>' +
      (wrong.length ? '<h3>To revise</h3>' + wrong.map(q => '<p class="rev"><b>' + esc(q[0]) + '</b><br>Answer: ' + esc(q[1][q[2]]) + '</p>').join('') : '') +
      '<div class="quiz-next"><a class="btn btn-amber" href="quiz.html?subject=' + (key || 'web-dev') + '">Retry</a> <a class="btn btn-outline" href="test-series.html">All tests</a></div>';
  }
  show();
})();
