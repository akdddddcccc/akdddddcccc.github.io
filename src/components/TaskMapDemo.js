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
      hoverId: "",
      draggingMapId: "",
      dropTargetId: "",
      timelineDrag: null,
      exportMessage: "",
      aiPrompt: "准备一个可以放进作品集的互动原型项目",
      aiMessage: "",
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
  beforeUnmount() {
    this.removeTimelineListeners();
  },
  computed: {
    labels() {
      return this.lang === "zh"
        ? {
            kicker: "Vibe Coding / Interaction Prototype",
            title: "Task Map：先梳理结构，再安排时间",
            intro: "这个 demo 尝试把任务管理从表单前移到结构思考：AI 只提供拆解思路与同级任务的初步时间划分，真正的结构关系和时间范围由用户在思维导图与甘特图中拖动确定。",
            mindMap: "思维导图",
            schedule: "时间轴 / 甘特结构",
            aiTitle: "AI 拆解建议",
            aiPlaceholder: "输入一个模糊目标，例如：准备作品集里的一个互动原型项目",
            aiGenerate: "生成拆解建议",
            aiMessage: "已补充同级子任务，并按父任务范围做了初步时间分配",
            canvasHint: "点击节点选中；拖动节点到另一个节点上可改变层级；悬停时显示下一级子任务。",
            hierarchyHint: "AI 只负责给拆解思路，节点增删、层级关系和时间范围由你拖动确认。",
            childPreview: "下一级子任务",
            noChildPreview: "当前节点暂无下一级子任务",
            ganttHint: "甘特图保留层级缩进，父任务显示整体范围，子任务显示具体执行段。",
            lightSchedule: "轻量时间提示",
            dateOptional: "日期是后置提示，不再作为创建任务的必填表单。",
            addChildInline: "添加子任务",
            addSiblingInline: "添加同级任务",
            promoteInline: "升级层级",
            indentInline: "降级为上方节点的子任务",
            deleteTask: "删除节点",
            keyboardHint: "键盘：Enter 新增同级，Tab 降级，Shift+Tab 升级，Delete 删除。",
            ddl: "DDL",
            ddlHint: "DDL 可精确到日期与小时；持续时间请在右侧甘特图中拖动确定。",
            dragRangeHint: "拖动黑色任务条即可重新确定任务范围。",
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
            intro: "This demo moves task planning away from form-first input. AI only suggests breakdown ideas and rough sibling time splits; users confirm structure and ranges by dragging the mind map and Gantt bars.",
            mindMap: "Mind map",
            schedule: "Timeline / Gantt structure",
            aiTitle: "AI breakdown suggestions",
            aiPlaceholder: "Type a fuzzy goal, e.g. prepare an interactive prototype for my portfolio",
            aiGenerate: "Generate breakdown",
            aiMessage: "Sibling child tasks were added and roughly split across the parent range",
            canvasHint: "Click to select. Drag a node onto another node to change hierarchy. Hover to reveal next-level children.",
            hierarchyHint: "AI only suggests breakdown ideas. You confirm nodes, hierarchy, and ranges by dragging.",
            childPreview: "Next-level children",
            noChildPreview: "No next-level children yet",
            ganttHint: "The Gantt view keeps hierarchy indentation: parent nodes show an overall range and child nodes show execution spans.",
            lightSchedule: "Light time signal",
            dateOptional: "Dates are optional later signals, not required creation fields.",
            addChildInline: "Add child task",
            addSiblingInline: "Add sibling task",
            promoteInline: "Promote level",
            indentInline: "Indent under previous node",
            deleteTask: "Delete node",
            keyboardHint: "Keyboard: Enter adds a sibling, Tab indents, Shift+Tab promotes, Delete removes.",
            ddl: "DDL",
            ddlHint: "DDL can be precise to date and hour. Drag Gantt bars to define duration ranges.",
            dragRangeHint: "Drag the black task bar to redefine the task range.",
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
    focusTask() {
      return this.tasks.find((task) => task.id === (this.hoverId || this.activeId)) || this.activeTask;
    },
    focusChildren() {
      return this.focusTask ? this.childrenOf(this.focusTask.id) : [];
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
    },
    mindMapNodes() {
      return this.flatTasks.map(({ task, depth }, index) => ({
        task,
        depth,
        x: 54 + depth * 180,
        y: 54 + index * 68,
        width: task.id === this.activeId ? 156 : 138,
        height: 38
      }));
    },
    mindMapLinks() {
      return this.mindMapNodes
        .filter((node) => node.task.parentId)
        .map((node) => {
          const parent = this.mindMapNodes.find((item) => item.task.id === node.task.parentId);
          if (!parent) return null;
          return {
            key: `${parent.task.id}-${node.task.id}`,
            fromId: parent.task.id,
            toId: node.task.id,
            x1: parent.x + parent.width,
            y1: parent.y + parent.height / 2,
            x2: node.x,
            y2: node.y + node.height / 2
          };
        })
        .filter(Boolean);
    },
    mindMapViewBox() {
      const maxX = Math.max(...this.mindMapNodes.map((node) => node.x + node.width), 700) + 60;
      const maxY = Math.max(...this.mindMapNodes.map((node) => node.y + node.height), 420) + 60;
      return `0 0 ${maxX} ${maxY}`;
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
    focusWorkspace() {
      this.$nextTick(() => {
        const workspace = this.$el.querySelector(".task-map-workspace");
        if (workspace) workspace.focus({ preventScroll: true });
      });
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
        ddl: "",
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
    addChildFor(task) {
      this.activeId = task.id;
      this.createTask(task.id);
    },
    addSibling() {
      if (!this.activeTask) return;
      this.createTask(this.activeTask.parentId, this.activeTask.id);
    },
    addSiblingFor(task) {
      this.activeId = task.id;
      this.createTask(task.parentId, task.id);
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
    handleWorkspaceKeydown(event) {
      const tag = event.target?.tagName;
      const isTyping = ["TEXTAREA", "SELECT"].includes(tag);
      const isTitleInput = event.target?.classList?.contains("task-inspector__title");
      if (isTyping || (tag === "INPUT" && !isTitleInput)) return;
      if (!this.activeTask) return;

      if (event.key === "Enter") {
        event.preventDefault();
        this.addSiblingFor(this.activeTask);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        if (event.shiftKey) this.promoteTask(this.activeTask);
        else this.indentTask(this.activeTask);
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && !isTitleInput) {
        event.preventDefault();
        this.deleteTask(this.activeTask);
      }
    },
    indentTask(task) {
      const index = this.tasks.findIndex((item) => item.id === task.id);
      const previous = this.tasks[index - 1];
      if (!previous || previous.id === task.parentId) return;
      task.parentId = previous.id;
      this.activeId = task.id;
    },
    promoteTask(task) {
      if (!task.parentId) return;
      const parent = this.tasks.find((item) => item.id === task.parentId);
      task.parentId = parent?.parentId || null;
      this.activeId = task.id;
    },
    canIndent(task) {
      const index = this.tasks.findIndex((item) => item.id === task.id);
      const previous = this.tasks[index - 1];
      return !!previous && previous.id !== task.parentId;
    },
    setHoverTask(id) {
      this.hoverId = id || "";
    },
    isTaskInHoverPath(taskId) {
      if (!this.hoverId) return false;
      if (taskId === this.hoverId) return true;
      const hoverTask = this.tasks.find((task) => task.id === this.hoverId);
      return hoverTask?.parentId === taskId || this.childrenOf(this.hoverId).some((task) => task.id === taskId);
    },
    isFocusChild(taskId) {
      const sourceId = this.hoverId || this.activeId;
      if (!sourceId) return false;
      return this.childrenOf(sourceId).some((task) => task.id === taskId);
    },
    isLinkInHoverPath(link) {
      if (!this.hoverId) return false;
      return link.fromId === this.hoverId || link.toId === this.hoverId;
    },
    setParent(value) {
      if (!this.activeTask) return;
      this.activeTask.parentId = value || null;
    },
    toggleDone(task) {
      task.done = !task.done;
    },
    descendantIds(id) {
      const ids = [];
      const collect = (parentId) => {
        this.childrenOf(parentId).forEach((child) => {
          ids.push(child.id);
          collect(child.id);
        });
      };
      collect(id);
      return ids;
    },
    deleteTask(task) {
      const ids = [task.id, ...this.descendantIds(task.id)];
      this.tasks = this.tasks.filter((item) => !ids.includes(item.id));
      if (!this.tasks.length) {
        this.addRoot();
        return;
      }
      if (ids.includes(this.activeId)) this.activeId = this.tasks[0].id;
      if (ids.includes(this.hoverId)) this.hoverId = "";
    },
    generateAiStructure() {
      const parent = this.activeTask || this.tasks[0];
      const seed = this.aiPrompt.trim() || parent.title;
      const baseTitles = this.lang === "zh"
        ? ["明确目标边界", "拆分关键阶段", "标记可执行节点", "识别需要排期的事项"]
        : ["Define goal boundary", "Split key stages", "Mark executable nodes", "Identify schedulable items"];
      const note = this.lang === "zh"
        ? `AI 根据“${seed}”生成的结构假设，可继续手动编辑。`
        : `AI-generated structure assumption from "${seed}". Keep editing manually.`;
      const parentRange = this.rangeFor(parent);
      const hasRange = parentRange.start && parentRange.end;
      const totalDays = hasRange ? Math.max(1, this.dayDiff(parentRange.start, parentRange.end) + 1) : 8;
      const sliceDays = Math.max(1, Math.floor(totalDays / baseTitles.length));
      const startSeed = hasRange ? parentRange.start : this.toDateInput(new Date());
      baseTitles.forEach((title, index) => {
        const start = this.addDays(startSeed, index * sliceDays);
        const end = index === baseTitles.length - 1
          ? this.addDays(startSeed, totalDays - 1)
          : this.addDays(start, sliceDays - 1);
        this.tasks.push({
          id: `task-ai-${Date.now()}-${index}`,
          parentId: parent.id,
          title,
          note,
          mode: "auto",
          start,
          end,
          ddl: `${end}T18:00`,
          done: false
        });
      });
      this.activeId = parent.id;
      this.aiMessage = this.labels.aiMessage;
    },
    shortTitle(value) {
      const source = value || "";
      return source.length > 12 ? `${source.slice(0, 12)}…` : source;
    },
    addDays(value, days) {
      const date = new Date(`${value}T00:00:00`);
      date.setDate(date.getDate() + days);
      return this.toDateInput(date);
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
    startMindDrag(event, task) {
      this.draggingMapId = task.id;
      this.dropTargetId = "";
      this.setHoverTask(task.id);
      event.preventDefault();
    },
    setMindDropTarget(task) {
      if (!this.draggingMapId || task.id === this.draggingMapId || this.isDescendant(task.id, this.draggingMapId)) {
        this.dropTargetId = "";
        return;
      }
      this.dropTargetId = task.id;
    },
    finishMindDrag(task) {
      if (!this.draggingMapId) return;
      const dragged = this.tasks.find((item) => item.id === this.draggingMapId);
      const targetId = this.dropTargetId || task?.id || "";
      if (dragged && targetId && targetId !== dragged.id && !this.isDescendant(targetId, dragged.id)) {
        dragged.parentId = targetId;
        this.activeId = dragged.id;
      }
      this.draggingMapId = "";
      this.dropTargetId = "";
    },
    cancelMindDrag() {
      this.draggingMapId = "";
      this.dropTargetId = "";
    },
    isMindDropTarget(taskId) {
      return this.dropTargetId === taskId;
    },
    startTimelineDrag(event, task) {
      if (!task.start || !task.end) {
        const range = this.rangeFor(task);
        task.start = range.start || this.toDateInput(this.timelineBounds.start);
        task.end = range.end || this.addDays(task.start, 1);
      }
      this.timelineDrag = {
        id: task.id,
        duration: Math.max(0, this.dayDiff(task.start, task.end))
      };
      window.addEventListener("mousemove", this.handleTimelineMove);
      window.addEventListener("mouseup", this.finishTimelineDrag);
      this.handleTimelineMove(event);
      event.preventDefault();
    },
    handleTimelineMove(event) {
      if (!this.timelineDrag) return;
      const task = this.tasks.find((item) => item.id === this.timelineDrag.id);
      if (!task) return;
      const track = event.target.closest?.(".task-timeline__track") || document.querySelector(`[data-timeline-id="${task.id}"]`);
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const percent = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const startBound = this.toDateInput(this.timelineBounds.start);
      const endBound = this.toDateInput(this.timelineBounds.end);
      const total = Math.max(1, this.dayDiff(startBound, endBound));
      const day = Math.round(percent * total);
      const start = this.addDays(startBound, day);
      task.start = start;
      task.end = this.addDays(start, this.timelineDrag.duration);
    },
    finishTimelineDrag() {
      this.removeTimelineListeners();
      this.timelineDrag = null;
    },
    removeTimelineListeners() {
      window.removeEventListener("mousemove", this.handleTimelineMove);
      window.removeEventListener("mouseup", this.finishTimelineDrag);
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
    <section class="task-map-demo task-map-workspace" aria-label="Task Map interactive demo" tabindex="0" @keydown="handleWorkspaceKeydown">
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

      <section class="task-ai-panel task-ai-panel--wide">
        <div>
          <span>{{ labels.aiTitle }}</span>
          <p>{{ labels.hierarchyHint }}</p>
        </div>
        <textarea v-model="aiPrompt" :placeholder="labels.aiPlaceholder" rows="2"></textarea>
        <div class="task-ai-panel__controls">
          <button type="button" @click="generateAiStructure">{{ labels.aiGenerate }}</button>
          <button type="button" @click="addRoot">+ {{ labels.addRoot }}</button>
          <span>{{ completedCount }} / {{ tasks.length }} {{ labels.completed }}</span>
        </div>
        <p v-if="aiMessage" class="task-ai-panel__message">{{ aiMessage }}</p>
      </section>

      <div class="task-map-shell task-map-shell--diagram">
        <section class="task-map-panel task-map-panel--map">
          <header class="task-map-panel__header">
            <div>
              <span>01</span>
              <h3>{{ labels.mindMap }}</h3>
            </div>
          </header>

          <div class="mind-map-canvas">
            <p>{{ labels.canvasHint }}</p>
            <svg :viewBox="mindMapViewBox" role="img" aria-label="Mind map canvas" @mouseup="finishMindDrag()" @mouseleave="cancelMindDrag">
              <path
                v-for="link in mindMapLinks"
                :key="link.key"
                class="mind-map-link"
                :class="{ active: isLinkInHoverPath(link) }"
                :d="'M ' + link.x1 + ' ' + link.y1 + ' C ' + (link.x1 + 58) + ' ' + link.y1 + ', ' + (link.x2 - 58) + ' ' + link.y2 + ', ' + link.x2 + ' ' + link.y2"
              />
              <g
                v-for="node in mindMapNodes"
                :key="node.task.id"
                class="mind-map-node"
                :class="{ active: activeId === node.task.id, done: node.task.done, conflict: taskConflict(node.task), 'hover-related': isTaskInHoverPath(node.task.id), dragging: draggingMapId === node.task.id, 'drop-target': isMindDropTarget(node.task.id) }"
                :transform="'translate(' + node.x + ' ' + node.y + ')'"
                @click="selectTask(node.task.id); focusWorkspace()"
                @mousedown.stop="startMindDrag($event, node.task)"
                @mouseenter="setHoverTask(node.task.id)"
                @mousemove="setMindDropTarget(node.task)"
                @mouseup.stop="finishMindDrag(node.task)"
                @mouseleave="setHoverTask('')"
              >
                <rect :width="node.width" :height="node.height" />
                <text x="12" y="24">{{ shortTitle(node.task.title) }}</text>
              </g>
            </svg>
            <div class="task-child-preview">
              <span>{{ labels.childPreview }} · {{ focusTask?.title }}</span>
              <div v-if="focusTask" class="task-child-preview__actions">
                <button type="button" @click="addChildFor(focusTask)">+ {{ labels.addChild }}</button>
                <button type="button" @click="addSiblingFor(focusTask)">+ {{ labels.addSibling }}</button>
                <button type="button" :disabled="!focusTask.parentId" @click="promoteTask(focusTask)">← {{ labels.promoteInline }}</button>
                <button type="button" :disabled="!canIndent(focusTask)" @click="indentTask(focusTask)">→ {{ labels.indentInline }}</button>
                <button type="button" @click="deleteTask(focusTask)">× {{ labels.deleteTask }}</button>
              </div>
              <div v-if="focusChildren.length">
                <button
                  v-for="child in focusChildren"
                  :key="child.id"
                  type="button"
                  @click="selectTask(child.id); focusWorkspace()"
                  @mouseenter="setHoverTask(child.id)"
                  @mouseleave="setHoverTask('')"
                >{{ child.title }}</button>
              </div>
              <p v-else>{{ labels.noChildPreview }}</p>
            </div>
          </div>

          <div v-if="activeTask" class="task-inspector">
            <p class="task-inspector__label">{{ labels.selected }}</p>
            <input v-model="activeTask.title" class="task-inspector__title" @keydown="handleWorkspaceKeydown" />
            <label>
              <span>{{ labels.parent }}</span>
              <select :value="activeTask.parentId || ''" @change="setParent($event.target.value)">
                <option value="">{{ labels.noParent }}</option>
                <option v-for="task in parentChoices" :key="task.id" :value="task.id">{{ task.title }}</option>
              </select>
            </label>
            <label>
              <span>{{ labels.note }}</span>
              <textarea v-model="activeTask.note" rows="3"></textarea>
            </label>
            <div class="task-time-details">
              <p>{{ labels.ddlHint }}</p>
              <label>
                <span>{{ labels.ddl }}</span>
                <input type="datetime-local" v-model="activeTask.ddl" />
              </label>
              <label>
                <span>Range mode</span>
                <select v-model="activeTask.mode">
                  <option value="auto">{{ labels.auto }}</option>
                  <option value="locked">{{ labels.locked }}</option>
                </select>
              </label>
            </div>
            <p v-if="taskConflict(activeTask)" class="task-warning">{{ labels.conflict }}</p>
          </div>
        </section>

        <section class="task-map-panel task-map-panel--gantt">
          <header class="task-map-panel__header">
            <div>
              <span>02</span>
              <h3>{{ labels.schedule }}</h3>
            </div>
          </header>
          <p class="task-gantt-hint">{{ labels.ganttHint }} {{ labels.dragRangeHint }}</p>
          <p class="task-keyboard-hint">{{ labels.keyboardHint }}</p>
            <div class="task-timeline" aria-label="Task timeline">
              <div class="task-timeline__dates" :style="{ '--day-count': timelineDays.length }">
                <span v-for="day in timelineDays" :key="day.key">{{ day.label }}</span>
              </div>
              <div
                v-for="{ task, depth } in flatTasks"
                :key="task.id + '-bar'"
                class="task-timeline__row"
                :class="{ conflict: taskConflict(task), done: task.done, active: activeId === task.id, 'focus-child': isFocusChild(task.id), 'hover-related': isTaskInHoverPath(task.id) }"
                @mouseenter="setHoverTask(task.id)"
                @mouseleave="setHoverTask('')"
                @click="selectTask(task.id); focusWorkspace()"
              >
                <span :style="{ paddingLeft: depth * 14 + 'px' }">{{ task.title }}</span>
                <div class="task-timeline__track" :data-timeline-id="task.id" :style="{ '--day-count': timelineDays.length }">
                  <i :style="barStyle(task)" @mousedown.stop="startTimelineDrag($event, task)"></i>
                </div>
              </div>
            </div>
        </section>
      </div>
    </section>
  `
};
