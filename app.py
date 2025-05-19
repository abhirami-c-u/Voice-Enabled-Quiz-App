from flask import Flask, render_template, request, jsonify
import pandas as pd
import matplotlib.pyplot as plt

app = Flask(__name__)

# Load questions from CSV
df = pd.read_csv("questions.csv")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_categories')
def get_categories():
    categories = df["Category"].unique().tolist()
    return jsonify(categories)

@app.route('/get_question', methods=['POST'])
def get_question():
    data = request.get_json()
    category = data.get("category")

    if category:
        questions = df[df["Category"] == category].sample(frac=1).reset_index(drop=True)
    else:
        questions = df.sample(frac=1).reset_index(drop=True)

    if len(questions) == 0:
        return jsonify({"error": "No questions available for this category."})

    return jsonify(questions.to_dict(orient="records"))

@app.route('/result', methods=['POST'])
def result():
    data = request.get_json()
    score = data["score"]
    total_questions = data["total_questions"]
    correct = data.get("correct_answers", 0)
    incorrect = data.get("incorrect_answers", 0)
    timeout = data.get("timeout_questions", 0)

    try:
        import matplotlib.pyplot as plt
        import os

        # Data for pie chart
        labels = ['Correct', 'Wrong', 'Timeout']
        values = [correct, incorrect, timeout]
        colors = ['green', 'red', 'orange']

        # Only plot if total > 0
        if sum(values) > 0:
            plt.figure(figsize=(4, 4))
            plt.pie(values, labels=labels, autopct='%1.1f%%', startangle=90, colors=colors)
            plt.axis('equal')

            # Ensure 'static' folder exists
            if not os.path.exists('static'):
                os.makedirs('static')

            plt.savefig('static/result.png')
            plt.close()
        else:
            print("Warning: No values to plot.")

    except Exception as e:
        print("Matplotlib error:", e)

    return jsonify({
        "score": score,
        "total_questions": total_questions,
        "correct_answers": correct,
        "incorrect_answers": incorrect,
        "timeout_questions": timeout
    })



if __name__ == '__main__':
    app.run(debug=True)  
