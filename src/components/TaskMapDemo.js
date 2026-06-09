export default {
  name: "TaskMapDemo",
  props: {
    lang: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      activeId: "task-3",
      exportMessage: "",
      tasks: [
        {
          id: "task-1",
          parentId: null,
          title: "作品集 Vue 架构升级",
          note: "先把目标拆成结构，再逐步进入排期。",
          mode: "auto",
          start: "",
          end: "",
          done: false
        },
        {
          id: "task-2",
          parentId: "task-1",
          title: "梳理旧网站信息架构",
          note: "保留原有项目内容，重组分类和访问路径。",
          mode: "auto",
          start: "2026-06-03",
          end: "2026-06-04",
          done: true
        },
        {
          id: "task-3",
          parentId: "task-1",
          title: "建立可切换的作品分类",
          note: "视觉、UI、工业产品、其他、未公开、vibe coding。",
          mode: "auto",
          start: "2026-06-04",
          end: "2026-06-05",
          done: true
        },
        {
          id: "task-4",
          parentId: "task-1",
          title: "加入互动原型体验区",
          note: "把 vibe coding 项目做成可直接体验的作品。",
          mode: "auto",
          start: "2026-06-09",
          end: "2026-06-10",
          done: false
        },
        {
          id: "task-5",
          parentId: null,
          title: "Task Map 原型验证",
          note: "测试先结构、后排期的工作流是否自然。",
          mode: "locked",
          start: "2026-06-09",
          end: "2026-06-16",
          done: false
        },
        {
          id: "task-6",
          parentId: "task-5",
          title: "完成交互 demo",
          note: "大纲编辑、完成状态、时间轴和导出。",
          mode: "auto",
          start: "2026-06-09",
          end: "2026-06-12",
          done: false
        },
        {
          id: "task-7",
          parentId: "task-5",
          title: "导出可交互 HTML",
          note: "不依赖登录或云端储存，导出后仍可点击完成。",
          mode: "auto",
          start: "2026-06-12",
          end: "2026-06-13",
          done: false
        },
        {
          id: "task-8",
          parentId: "task-5",
          title: "整理 PDF 汇报版本",
          note: "通过浏览器打印保存为 PDF。",
          mode: "auto",
          start: "2026-06-15",
          end: "2026-06-16",
          done: false
        }
      ]
    };
  },
  computed: {
    labels() {
      return this.lang === "zh"
        ? {
            kicker: "Vibe Coding / Interaction Prototype",
            title: "Task Map：先梳理结构，再安排时间",
            intro: "这个 demo 尝试把任务管理从表单前移到结构思考：先用大纲拆分复杂事项，再给具体节点补充时间，父任务自动形成或锁定整体范围。",
            structure: "结构模式",
            schedule: "排期模式",
            selected: "选中节点",
            addRoot: "根目标",
            addChild: "子任务",
            addSibling: "同级任务",
            exportHtml: "导出互动 HTML",
            exportPdf: "导出 PDF",
            complete: "完成",
            completed: "已完成",
            auto: "自动汇总",
            locked: "手动锁定",
            start: "开始",
            end: "截止",
            note: "备注",
            parent: "父级",
            noParent: "根节点",
            timeline: "时间轴",
            conflict: "超出锁定父任务范围",
            exportReady: "已生成下载文件",
            printHint: "请在打印窗口中选择保存为 PDF"
          }
        : {
            kicker: "Vibe Coding / Interaction Prototype",
            title: "Task Map: structure first, schedule later",
            intro: "This demo moves task planning away from form-first input. Build the outline first, then assign dates to concrete nodes while parent ranges are inferred or locked.",
            structure: "Structure mode",
            schedule: "Schedule mode",
            selected: "Selected node",
            addRoot: "Root goal",
            addChild: "Child task",
            addSibling: "Sibling task",
            exportHtml: "Export interactive HTML",
            exportPdf: "Export PDF",
            complete: "Complete",
            completed: "Completed",
            auto: "Auto range",
            locked: "Locked range",
            start: "Start",
            end: "Due",
            note: "Note",
            parent: "Parent",
            noParent: "Root",
            timeline: "Timeline",
            conflict: "Outside locked parent range",
            exportReady: "Download file generated",
            printHint: "Choose Save as PDF in the print window"
          };
    },
    rootTasks() {
      return this.tasks.filter((task) => !task.parentId);
    },
    flatTasks() {
      const rows = [];
      const walk = (task, depth) => {
        rows.push({ task, depth });
        this.childrenOf(task.id).forEach((child) => walk(child, depth + 1));
      };
      this.rootTasks.forEach((task) => walk(task, 0));
      return rows;
    },
    activeTask() {
      return this.tasks.find((task) => task.id === this.activeId) || this.tasks[0];
    },
    parentChoices() {
      return this.tasks.filter((task) => task.id !== this.activeTask?.id && !this.isDescendant(task.id, this.activeTask?.id));
    },
    timelineBounds() {
      const dates = this.tasks
        .flatMap((task) => [this.rangeFor(task).start, this.rangeFor(task).end])
        .filter(Boolean)
        .map((value) => new Date(`${value}T00:00:00`));
      if (!dates.length) {
        return {
          start: new Date("2026-06-09T00:00:00"),
          end: new Date("2026-06-16T00:00:00")
        };
      }
      const min = new Date(Math.min(...dates));
      const max = new Date(Math.max(...dates));
      min.setDate(min.getDate() - 1);
      max.setDate(max.getDate() + 1);
      return { start: min, end: max };
    },
    timelineDays() {
      const days = [];
      const cursor = new Date(this.timelineBounds.start);
      while (cursor <= this.timelineBounds.end) {
        days.push({
          key: this.toDateInput(cursor),
          label: `${cursor.getMonth() + 1}/${cursor.getDate()}`
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    },
    completedCount() {
      return this.tasks.filter((task) => task.done).length;
    },
    progressPercent() {
      return Math.round((this.completedCount / this.tasks.length) * 100);
    }
  },
  methods: {
    childrenOf(id) {
      return this.tasks.filter((task) => task.parentId === id);
    },
    isDescendant(candidateId, parentId) {
      if (!candidateId || !parentId) return false;
      const childIds = this.childrenOf(parentId).map((task) => task.id);
      if (childIds.includes(candidateId)) return true;
      return childIds.some((id) => this.isDescendant(candidateId, id));
    },
    isParent(task) {
      return this.childrenOf(task.id).length > 0;
    },
    selectTask(id) {
      this.activeId = id;
    },
    createTask(parentId = null, afterId = "") {
      const id = `task-${Date.now()}-${Math.round(Math.random() * 1000)}`;
      const task = {
        id,
        parentId,
        title: this.lang === "zh" ? "新的任务节点" : "New task node",
        note: "",
        mode: "auto",
        start: "",
        end: "",
        done: false
      };
      if (!afterId) {
        this.tasks.push(task);
      } else {
        const index = this.tasks.findIndex((item) => item.id === afterId);
        this.tasks.splice(index + 1, 0, task);
      }
      this.activeId = id;
      this.$nextTick(() => {
        const input = this.$el.querySelector(`[data-task-input="${id}"]`);
        if (input) input.focus();
      });
    },
    addRoot() {
      this.createTask(null);
    },
    addChild() {
      if (!this.activeTask) return;
      this.createTask(this.activeTask.id);
    },
    addSibling() {
      if (!this.activeTask) return;
      this.createTask(this.activeTask.parentId, this.activeTask.id);
    },
    handleTitleKeydown(event, task) {
      if (event.key === "Enter") {
        event.preventDefault();
        this.activeId = task.id;
        this.addSibling();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        this.activeId = task.id;
        if (event.shiftKey) this.promoteTask(task);
        else this.indentTask(task);
      }
    },
    indentTask(task) {
      const index = this.tasks.findIndex((item) => item.id === task.id);
      const previous = this.tasks[index - 1];
      if (!previous || previous.id === task.parentId) return;
      task.parentId = previous.id;
    },
    promoteTask(task) {
      if (!task.parentId) return;
      const parent = this.tasks.find((item) => item.id === task.parentId);
      task.parentId = parent?.parentId || null;
    },
    setParent(value) {
      if (!this.activeTask) return;
      this.activeTask.parentId = value || null;
    },
    toggleDone(task) {
      task.done = !task.done;
    },
    toDateInput(date) {
      return date.toISOString().slice(0, 10);
    },
    rangeFor(task) {
      if (!task) return { start: "", end: "" };
      const children = this.childrenOf(task.id);
      if (task.mode === "locked" || !children.length) {
        return { start: task.start, end: task.end };
      }
      const starts = children.map((child) => this.rangeFor(child).start).filter(Boolean).sort();
      const ends = children.map((child) => this.rangeFor(child).end).filter(Boolean).sort();
      return {
        start: starts[0] || task.start,
        end: ends[ends.length - 1] || task.end
      };
    },
    displayRange(task) {
      const range = this.rangeFor(task);
      if (!range.start && !range.end) return "no date";
      return `${range.start || "?"} → ${range.end || "?"}`;
    },
    taskConflict(task) {
      if (!task.parentId) return false;
      const parent = this.tasks.find((item) => item.id === task.parentId);
      if (!parent || parent.mode !== "locked") return false;
      const range = this.rangeFor(task);
      const parentRange = this.rangeFor(parent);
      if (!range.start || !range.end || !parentRange.start || !parentRange.end) return false;
      return range.start < parentRange.start || range.end > parentRange.end;
    },
    dayDiff(from, to) {
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T00:00:00`);
      return Math.round((end - start) / 86400000);
    },
    barStyle(task) {
      const range = this.rangeFor(task);
      if (!range.start || !range.end) return { display: "none" };
      const total = Math.max(1, this.dayDiff(this.toDateInput(this.timelineBounds.start), this.toDateInput(this.timelineBounds.end)));
      const left = Math.max(0, this.dayDiff(this.toDateInput(this.timelineBounds.start), range.start));
      const width = Math.max(1, this.dayDiff(range.start, range.end) + 1);
      return {
        left: `${(left / total) * 100}%`,
        width: `${(width / total) * 100}%`
      };
    },
    exportInteractiveHtml() {
      const labels = this.labels;
      const payload = JSON.stringify(this.tasks, null, 2);
      const html = `<!doctype html>
<html lang="${this.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Task Map Interactive Demo</title>
<style>
body{margin:0;background:#f5f5f2;color:#111;font-family:Arial,"Helvetica Neue",sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:36px 20px 70px}
h1{font-size:clamp(34px,7vw,82px);line-height:.95;margin:0 0 18px}
p{line-height:1.7;color:#555}.bar{height:10px;background:#ddd;margin:24px 0}.bar span{display:block;height:100%;background:#111}
.task{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border-top:1px solid #ccc;padding:11px 0}
.task input[type=text]{width:100%;border:0;background:transparent;font:inherit}
.task button{border:1px solid #111;background:#fff;padding:7px 10px;cursor:pointer}
.done input[type=text]{text-decoration:line-through;color:#888}
.meta{font-family:monospace;font-size:12px;color:#777}.child{margin-left:28px}
</style>
</head>
<body>
<main class="wrap">
<h1>Task Map</h1>
<p>${labels.intro}</p>
<div class="bar"><span id="progress"></span></div>
<section id="app"></section>
</main>
<script>
const tasks=${payload};
const app=document.getElementById('app');
function childrenOf(id){return tasks.filter(task=>task.parentId===id)}
function render(){
  app.innerHTML='';
  const rows=[];
  function walk(task,depth){rows.push({task,depth});childrenOf(task.id).forEach(child=>walk(child,depth+1))}
  tasks.filter(task=>!task.parentId).forEach(task=>walk(task,0));
  rows.forEach(({task,depth})=>{
    const row=document.createElement('div');
    row.className='task '+(task.done?'done ':'')+(depth?'child':'');
    row.style.marginLeft=(depth*22)+'px';
    row.innerHTML='<button type="button">'+(task.done?'${labels.completed}':'${labels.complete}')+'</button><input type="text" value="'+task.title.replace(/"/g,'&quot;')+'"><span class="meta">'+(task.start||'?')+' → '+(task.end||'?')+'</span>';
    row.querySelector('button').onclick=()=>{task.done=!task.done;render()};
    row.querySelector('input').oninput=(event)=>{task.title=event.target.value};
    app.appendChild(row);
  });
  document.getElementById('progress').style.width=Math.round(tasks.filter(task=>task.done).length/tasks.length*100)+'%';
}
render();
</script>
</body>
</html>`;
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "task-map-interactive-demo.html";
      link.click();
      URL.revokeObjectURL(url);
      this.exportMessage = labels.exportReady;
    },
    exportPdf() {
      const labels = this.labels;
      const rows = this.flatTasks.map(({ task, depth }) => {
        const indent = depth * 18;
        return `<tr>
          <td style="padding-left:${indent}px">${task.done ? "✓" : "○"} ${task.title}</td>
          <td>${this.displayRange(task)}</td>
          <td>${task.mode === "locked" ? labels.locked : labels.auto}</td>
        </tr>`;
      }).join("");
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Task Map PDF</title>
        <style>
          body{font-family:Arial,"Helvetica Neue",sans-serif;padding:34px;color:#111}
          h1{font-size:42px;margin:0 0 12px}
          p{line-height:1.7;color:#555}
          table{width:100%;border-collapse:collapse;margin-top:28px}
          th,td{border-top:1px solid #bbb;padding:12px 8px;text-align:left;vertical-align:top}
          th{font-family:monospace;font-size:12px;text-transform:uppercase;color:#666}
        </style>
      </head><body>
        <h1>Task Map Prototype</h1>
        <p>${labels.intro}</p>
        <table>
          <thead><tr><th>Task</th><th>Range</th><th>Mode</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload=()=>window.print();</script>
      </body></html>`);
      win.document.close();
      this.exportMessage = labels.printHint;
    }
  },
  template: `
    <section class="task-map-demo" aria-label="Task Map interactive demo">
      <div class="task-map-demo__intro">
        <p class="task-map-demo__kicker">{{ labels.kicker }}</p>
        <h2>{{ labels.title }}</h2>
        <p>{{ labels.intro }}</p>
        <div class="task-map-demo__actions">
          <button type="button" @click="exportInteractiveHtml">{{ labels.exportHtml }}</button>
          <button type="button" @click="exportPdf">{{ labels.exportPdf }}</button>
          <span v-if="exportMessage">{{ exportMessage }}</span>
        </div>
      </div>

      <div class="task-map-shell">
        <section class="task-map-panel task-map-panel--structure">
          <header class="task-map-panel__header">
            <div>
              <span>01</span>
              <h3>{{ labels.structure }}</h3>
            </div>
            <div class="task-map-toolbar">
              <button type="button" @click="addRoot">+ {{ labels.addRoot }}</button>
              <button type="button" @click="addChild">+ {{ labels.addChild }}</button>
              <button type="button" @click="addSibling">+ {{ labels.addSibling }}</button>
            </div>
          </header>

          <div class="task-progress">
            <span>{{ completedCount }} / {{ tasks.length }} {{ labels.completed }}</span>
            <div><i :style="{ width: progressPercent + '%' }"></i></div>
          </div>

          <div class="task-outline">
            <article
              v-for="{ task, depth } in flatTasks"
              :key="task.id"
              class="task-node"
              :class="{ active: activeId === task.id, done: task.done, conflict: taskConflict(task) }"
              :style="{ '--depth': depth }"
              @click="selectTask(task.id)"
            >
              <button type="button" class="task-complete" @click.stop="toggleDone(task)">
                {{ task.done ? '✓' : '' }}
              </button>
              <div class="task-node__main">
                <input
                  :data-task-input="task.id"
                  v-model="task.title"
                  @focus="selectTask(task.id)"
                  @keydown="handleTitleKeydown($event, task)"
                />
                <p>{{ task.note || displayRange(task) }}</p>
              </div>
              <span class="task-node__mode">{{ task.mode === 'locked' ? labels.locked : labels.auto }}</span>
            </article>
          </div>
        </section>

        <section class="task-map-panel task-map-panel--schedule">
          <header class="task-map-panel__header">
            <div>
              <span>02</span>
              <h3>{{ labels.schedule }}</h3>
            </div>
          </header>

          <div v-if="activeTask" class="task-inspector">
            <p class="task-inspector__label">{{ labels.selected }}</p>
            <input v-model="activeTask.title" class="task-inspector__title" />
            <label>
              <span>{{ labels.parent }}</span>
              <select :value="activeTask.parentId || ''" @change="setParent($event.target.value)">
                <option value="">{{ labels.noParent }}</option>
                <option v-for="task in parentChoices" :key="task.id" :value="task.id">{{ task.title }}</option>
              </select>
            </label>
            <div class="task-inspector__grid">
              <label>
                <span>{{ labels.start }}</span>
                <input type="date" v-model="activeTask.start" />
              </label>
              <label>
                <span>{{ labels.end }}</span>
                <input type="date" v-model="activeTask.end" />
              </label>
            </div>
            <label>
              <span>Range mode</span>
              <select v-model="activeTask.mode">
                <option value="auto">{{ labels.auto }}</option>
                <option value="locked">{{ labels.locked }}</option>
              </select>
            </label>
            <label>
              <span>{{ labels.note }}</span>
              <textarea v-model="activeTask.note" rows="3"></textarea>
            </label>
            <p v-if="taskConflict(activeTask)" class="task-warning">{{ labels.conflict }}</p>
          </div>

          <div class="task-timeline" aria-label="Task timeline">
            <div class="task-timeline__dates" :style="{ '--day-count': timelineDays.length }">
              <span v-for="day in timelineDays" :key="day.key">{{ day.label }}</span>
            </div>
            <div
              v-for="{ task, depth } in flatTasks"
              :key="task.id + '-bar'"
              class="task-timeline__row"
              :class="{ conflict: taskConflict(task), done: task.done }"
            >
              <span :style="{ paddingLeft: depth * 14 + 'px' }">{{ task.title }}</span>
              <div :style="{ '--day-count': timelineDays.length }">
                <i :style="barStyle(task)"></i>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  `
};
