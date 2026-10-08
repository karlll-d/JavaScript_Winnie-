
const taskInput = document.querySelector('#taskInput');
const addTaskBtn = document.querySelector('#addTaskBtn');
const taskList = document.querySelector('#taskList');


let tasks = JSON.parse(localStorage.getItem('tasks')) || [];


function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}


function renderTasks() {
  taskList.innerHTML = '';

  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    if (task.completed) {
      li.classList.add('completed');
    }

    const taskText = document.createElement('span');
    taskText.textContent = task.text;

    
    taskText.addEventListener('click', () => toggleTask(index));

    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => deleteTask(index));

    li.appendChild(taskText);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}


function addTask() {
  const text = taskInput.value.trim();
  if (text === '') return;

  tasks.push({ text: text, completed: false });
  saveTasks();
  renderTasks();
  taskInput.value = '';
}


function toggleTask(index) {
  tasks[index].completed = !tasks[index].completed;
  saveTasks();
  renderTasks();
}

// Delete task
function deleteTask(index) {
  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
}


addTaskBtn.addEventListener('click', addTask);

taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTask();
  }
});


renderTasks();