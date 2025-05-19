document.addEventListener("DOMContentLoaded", function () {
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let timeoutQuestions = 0;
    let timer;
    let startTime;
    let synth = window.speechSynthesis;

    function fetchCategories() {
        fetch("/get_categories")
            .then(response => response.json())
            .then(categories => {
                let categoryDropdown = document.getElementById("category");
                categoryDropdown.innerHTML = ""; // Clear existing options
                
                categories.forEach(cat => {
                    let option = document.createElement("option");
                    option.value = cat;
                    option.textContent = cat;
                    categoryDropdown.appendChild(option);
                });
            })
            .catch(error => console.error("Error fetching categories:", error));
    }

    function startQuiz() {
        let category = document.getElementById("category").value;

        fetch("/get_question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: category })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            questions = data;
            currentQuestionIndex = 0;
            score = 0;
            correctAnswers = 0;
            incorrectAnswers = 0;
            document.getElementById("quiz-container").style.display = "block";
            document.getElementById("startQuiz").style.display = "none";
            loadQuestion();
        });
    }

    function loadQuestion() {
        if (currentQuestionIndex >= questions.length) {
            submitResults();
            return;
        }

        let questionData = questions[currentQuestionIndex];
        document.getElementById("question").textContent = questionData["Question"];
        let optionsContainer = document.getElementById("options");
        optionsContainer.innerHTML = "";

        ["A", "B", "C", "D"].forEach(letter => {
            let button = document.createElement("button");
            button.textContent = questionData[`Option ${letter}`];
            button.classList.add("option-btn");
            button.onclick = () => checkAnswer(button, questionData["Answer"]);
            optionsContainer.appendChild(button);
        });

        startTime = Date.now();
        startTimer();
        if (document.getElementById("audio").checked) {
            readQuestion(questionData);
        }
    }

    function startTimer() {
        let timeLeft = 50;
        document.getElementById("timeLeft").textContent = timeLeft;
        clearInterval(timer);

        timer = setInterval(() => {
            timeLeft--;
            document.getElementById("timeLeft").textContent = timeLeft;
            document.getElementById("progressBar").value = (50 - timeLeft) * 100 / 50;

            if (timeLeft === 0) {
                clearInterval(timer);
                timeoutQuestions++;
                loadNextQuestion();
            }
        }, 1000);
    }

    function checkAnswer(selectedBtn, correctAnswer) {
        clearInterval(timer);
        stopAudio();
        let timeTaken = (Date.now() - startTime) / 1000;
        let earnedPoints = Math.max(1, Math.round(10 * (1 - timeTaken / 60)));
        
        let allButtons = document.querySelectorAll(".option-btn");
        
        allButtons.forEach(button => {
            if (button.textContent === correctAnswer) {
                button.style.backgroundColor = "green"; // Correct answer in green
                button.style.color = "white";
            } 
            if (button !== selectedBtn && button.textContent !== correctAnswer) {
                button.style.backgroundColor = ""; // Reset incorrect options
                button.style.color = "";
            }
        });

        if (selectedBtn.textContent === correctAnswer) {
            score += earnedPoints;
            correctAnswers++; // Increment correct answer count
            selectedBtn.style.backgroundColor = "green"; 
            selectedBtn.style.color = "white";
        } else {
            incorrectAnswers++; // Increment incorrect answer count
            selectedBtn.style.backgroundColor = "red"; 
            selectedBtn.style.color = "white";
        }

        document.getElementById("nextQuestion").style.display = "block";
    }

    function loadNextQuestion() {
        currentQuestionIndex++;
        document.getElementById("nextQuestion").style.display = "none";
        loadQuestion();
    }
    function readFinalComment(comment) {
        let msg = new SpeechSynthesisUtterance();
        msg.text = `Your final score is ${score} out of ${questions.length * 10}. ${comment}`;
        synth.speak(msg);
    }
    
    function submitResults() {
        fetch("/result", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                score: score,
                total_questions: questions.length,
                correct_answers: correctAnswers,
                incorrect_answers: incorrectAnswers,
                timeout_questions: timeoutQuestions
            })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById("quiz-container").style.display = "none";
            document.getElementById("final-score").style.display = "block";
    
            // Display final results
            document.getElementById("score").textContent = data.score;
            document.getElementById("total-questions").textContent = data.total_questions;
            document.getElementById("correct-answers").textContent = data.correct_answers || correctAnswers;
            document.getElementById("incorrect-answers").textContent = data.incorrect_answers || incorrectAnswers;
            document.getElementById("timeout-questions").textContent = data.timeout_questions || timeoutQuestions;
    
            // Assign comments based on performance
            let percentage = (data.score / (data.total_questions * 10)) * 100;
            let comment = "";
    
            if (percentage >= 90) {
                comment = "Excellent! Keep up the great work!";
            } else if (percentage >= 70) {
                comment = "Good job! You have a strong grasp of the material.";
            } else if (percentage >= 50) {
                comment = "Nice effort! Keep practicing to improve.";
            } else {
                comment = "Don't give up! Try again and learn from your mistakes.";
            }
    
            document.getElementById("comment").textContent = comment;
            
            // 🎙️ Read the final comment aloud
            if (document.getElementById("audio").checked) {
                readFinalComment(comment);
            }
    
            // Show the retake button
            document.getElementById("retakeQuiz").style.display = "block";

            document.getElementById("chart-section").style.display = "block";
            document.getElementById("resultChart").src = "/static/result.png?t=" + new Date().getTime();


        });
    }
    
    function readQuestion(questionData) {
        let msg = new SpeechSynthesisUtterance();
        msg.text = `${questionData["Question"]}. Options are: A) ${questionData["Option A"]}, B) ${questionData["Option B"]}, C) ${questionData["Option C"]}, D) ${questionData["Option D"]}.`;
        synth.speak(msg);
    }
    document.getElementById("retakeQuiz").addEventListener("click", function () {
        document.getElementById("final-score").style.display = "none";
        document.getElementById("startQuiz").style.display = "block";
        document.getElementById("retakeQuiz").style.display = "none"; // Hide button after restart
    
        // Reset quiz state
        questions = [];
        currentQuestionIndex = 0;
        score = 0;
        correctAnswers = 0;
        incorrectAnswers = 0;
        timeoutQuestions = 0;
    });
    
    function stopAudio() {
        synth.cancel();
    }

    document.getElementById("startQuiz").addEventListener("click", startQuiz);
    document.getElementById("nextQuestion").addEventListener("click", loadNextQuestion);

    fetchCategories();  // Fetch categories on page load
});
