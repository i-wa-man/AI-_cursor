const state = {
  meta: { generatedAt: null, reportCount: 0 },
  reports: [],
};

const elements = {
  startDate: document.getElementById('startDate'),
  endDate: document.getElementById('endDate'),
  keyword: document.getElementById('keyword'),
  resetFilters: document.getElementById('resetFilters'),
  reportCount: document.getElementById('reportCount'),
  generatedAt: document.getElementById('generatedAt'),
  totalTasks: document.getElementById('totalTasks'),
  doneTasks: document.getElementById('doneTasks'),
  pendingTasks: document.getElementById('pendingTasks'),
  completionRate: document.getElementById('completionRate'),
  taskTableBody: document.querySelector('#taskTable tbody'),
  achievementList: document.getElementById('achievementList'),
  issueList: document.getElementById('issueList'),
  timeline: document.getElementById('timeline'),
};

const formatters = {
  date(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('ja-JP', { weekday: 'short', month: 'short', day: 'numeric' });
  },
  timestamp(ts) {
    if (!ts) return '-';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return ts;
    return date.toLocaleString('ja-JP');
  },
};

function attachEvents() {
  ['change', 'input'].forEach((eventName) => {
    elements.startDate.addEventListener(eventName, render);
    elements.endDate.addEventListener(eventName, render);
    elements.keyword.addEventListener(eventName, render);
  });

  elements.resetFilters.addEventListener('click', () => {
    elements.startDate.value = '';
    elements.endDate.value = '';
    elements.keyword.value = '';
    render();
  });
}

function filterReports() {
  const start = elements.startDate.value;
  const end = elements.endDate.value;
  const keyword = elements.keyword.value.trim().toLowerCase();

  return state.reports.filter((report) => {
    if (start && report.date < start) return false;
    if (end && report.date > end) return false;
    if (keyword) {
      const haystack = [
        report.sections.work.map((t) => t.text).join(' '),
        report.sections.plans.map((t) => t.text).join(' '),
        report.sections.achievements.join(' '),
        report.sections.issues.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

function flattenTasks(reports) {
  return reports.flatMap((report) => {
    const workTasks = report.sections.work.map((task) => ({
      ...task,
      category: '本日の業務',
      date: report.date,
    }));
    const planTasks = report.sections.plans.map((task) => ({
      ...task,
      category: '明日の予定',
      date: report.date,
    }));
    return [...workTasks, ...planTasks];
  });
}

function renderStats(tasks) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  const pending = total - done;
  const rate = total ? `${Math.round((done / total) * 100)}%` : '-';

  elements.totalTasks.textContent = total;
  elements.doneTasks.textContent = done;
  elements.pendingTasks.textContent = pending;
  elements.completionRate.textContent = rate;
}

function renderTaskTable(tasks) {
  elements.taskTableBody.innerHTML = '';
  if (!tasks.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = '条件に一致するタスクはありません。';
    row.appendChild(cell);
    elements.taskTableBody.appendChild(row);
    return;
  }

  const sorted = [...tasks].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const task of sorted) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${task.date}</td>
      <td>${task.category}</td>
      <td><span class="badge ${task.done ? 'done' : 'pending'}">${task.done ? '完了' : '未完'}</span></td>
      <td>${task.text}</td>
    `;
    elements.taskTableBody.appendChild(row);
  }
}

function renderHighlights(reports) {
  const achievements = reports.flatMap((report) => report.sections.achievements.map((text) => ({
    date: report.date,
    text,
  })));
  const issues = reports.flatMap((report) => report.sections.issues.map((text) => ({
    date: report.date,
    text,
  })));

  const topAchievements = achievements.slice(-5).reverse();
  const topIssues = issues.slice(-5).reverse();

  const fillList = (element, items, emptyMessage) => {
    element.innerHTML = '';
    if (!items.length) {
      const li = document.createElement('li');
      li.textContent = emptyMessage;
      element.appendChild(li);
      return;
    }
    for (const item of items) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="meta">${item.date}</span> ${item.text}`;
      element.appendChild(li);
    }
  };

  fillList(elements.achievementList, topAchievements, '成果はまだありません。');
  fillList(elements.issueList, topIssues, '課題はまだありません。');
}

function renderTimeline(reports) {
  elements.timeline.innerHTML = '';
  if (!reports.length) {
    const li = document.createElement('li');
    li.textContent = '表示できる日報がありません。';
    elements.timeline.appendChild(li);
    return;
  }

  const sorted = [...reports].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const report of sorted) {
    const li = document.createElement('li');
    const workSummary = report.sections.work
      .map((task) => `${task.done ? '✓' : '・'} ${task.text}`)
      .join('<br />');
    const achievements = report.sections.achievements
      .map((text) => `<li>${text}</li>`)
      .join('');

    li.innerHTML = `
      <h3>${formatters.date(report.date)}</h3>
      <p class="meta">${report.sections.work.length}件の業務 / 成果 ${report.sections.achievements.length}件</p>
      <p>${workSummary || 'タスク記録なし'}</p>
      ${achievements ? `<ul>${achievements}</ul>` : ''}
    `;
    elements.timeline.appendChild(li);
  }
}

function render() {
  const filteredReports = filterReports();
  const tasks = flattenTasks(filteredReports);

  renderStats(tasks);
  renderTaskTable(tasks);
  renderHighlights(filteredReports);
  renderTimeline(filteredReports);
}

async function loadData() {
  const cacheBusting = `?v=${Date.now()}`;
  const response = await fetch(`daily_reports.json${cacheBusting}`);
  if (!response.ok) {
    throw new Error('daily_reports.jsonの取得に失敗しました');
  }
  const data = await response.json();
  state.meta.generatedAt = data.generatedAt;
  state.meta.reportCount = data.reportCount;
  state.reports = data.reports || [];

  elements.reportCount.textContent = `${state.meta.reportCount}件`;
  elements.generatedAt.textContent = formatters.timestamp(state.meta.generatedAt);
}

async function init() {
  try {
    await loadData();
    attachEvents();
    render();
  } catch (error) {
    console.error(error);
    elements.taskTableBody.innerHTML = `<tr><td colspan="4">データの読み込みに失敗しました: ${error.message}</td></tr>`;
  }
}

init();
