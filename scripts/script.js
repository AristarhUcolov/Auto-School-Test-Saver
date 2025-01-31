document.getElementById("saveResults").addEventListener("click", () => {
  const studentName = document.getElementById("studentName").value.trim();
  const examDate = document.getElementById("examDate").value.trim();
  const group = document.getElementById("group").value.trim();

  if (!studentName || !examDate || !group) {
    alert("Пожалуйста, заполните все поля!");
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: saveExamResultsWithQuestions,
      args: [studentName, examDate, group],
    });
  });
});

function saveExamResultsWithQuestions(studentName, examDate, group) {
  const groups = Array.from(document.querySelectorAll('[role="group"]'));
  const totalGroups = groups.length;
  let allResultsHtml = '';
  let isSavingInProgress = false;
  let processedGroups = new Set();
  let processedQuestions = new Set();

  function collectResults(groupIndex) {
    if (groupIndex >= totalGroups || isSavingInProgress) {
      if (!isSavingInProgress) {
        isSavingInProgress = true;
        saveToFile(allResultsHtml);
      }
      return;
    }

    const group = groups[groupIndex];
    const groupIdentifier = `group-${groupIndex + 1}`;

    if (processedGroups.has(groupIdentifier)) {
      collectResults(groupIndex + 1);
      return;
    }

    group.click();

    setTimeout(() => {
      const questions = Array.from(document.querySelectorAll("#questions .btn"));
      const questionTexts = Array.from(document.querySelectorAll("#question_text"));
      const questionImgs = Array.from(document.querySelectorAll("#question_img"));
      const questionHints = Array.from(document.querySelectorAll("#question_hint"));

      let questionDetailsHtml = '';
      questions.forEach((btn, index) => {
        const questionTitle = btn.getAttribute('title');
        const questionText = questionTexts[index] ? questionTexts[index].innerHTML.trim() : '';
        const questionImg = questionImgs[index] ? questionImgs[index].src : '';
        const questionHint = questionHints[index] ? questionHints[index].innerHTML.trim() : '';

        const questionIdentifier = `${questionTitle}-${questionText}`;

        if (processedQuestions.has(questionIdentifier)) {
          return;
        }

        processedQuestions.add(questionIdentifier);

        const answerButtons = Array.from(document.querySelectorAll("#answers button"));
        let answerDetails = '';

        answerButtons.forEach((btn) => {
          const answerText = btn.innerHTML.trim();
          const isCorrect = btn.classList.contains("btn-success");
          const isSelected = btn.classList.contains("btn-selected");

          let color = "black";
          if (isCorrect) color = "green";
          if (isSelected && !isCorrect) color = "red";

          answerDetails += `<li style="color: ${color}">${answerText}</li>`;
        });

        questionDetailsHtml += `
          <div>
            <h3>Вопрос ${questionTitle}</h3>
            <p><strong>Текст:</strong> ${questionText}</p>
            <img src="${questionImg}" alt="Вопросное изображение" style="max-width: 100px;">
            <p><strong>Подсказка:</strong> ${questionHint}</p>
            <p><strong>Ответы:</strong></p>
            <ul>${answerDetails}</ul>
          </div>`;
      });

      if (questionDetailsHtml) {
        allResultsHtml += `
          <div>
            <h2>Группа ${groupIndex + 1}</h2>
            ${questionDetailsHtml}
          </div>`;
        processedGroups.add(groupIdentifier);
      }

      collectResults(groupIndex + 1);
    }, 500);
  }

  collectResults(0);

  function saveToFile(htmlContent) {
    const resultHtml = `
      <html>
        <head><title>Результаты экзамена</title></head>
        <body>
          <h1>Результаты экзамена</h1>
          <p><strong>Имя и Фамилия:</strong> ${studentName}</p>
          <p><strong>Дата:</strong> ${examDate}</p>
          <p><strong>Группа:</strong> ${group}</p>
          ${htmlContent}
        </body>
      </html>`;

    const blob = new Blob([resultHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ExamResults_${studentName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
