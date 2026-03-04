from flask import Flask, render_template
import pymysql

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('sections/calendar.html')

@app.route('/<section>')
def show_section(section):
    valid_sections = ['marketplace', 'progress', 'notes', 'pomodoro', 'calendar', 'achievements']
    if section in valid_sections:
        return render_template(f'sections/{section}.html', active_section=section)
    return render_template('sections/marketplace.html')

if __name__ == '__main__':
    app.run(debug=True)

def get_db():
    return pymysql.connect(
        host="yamanote.proxy.rlwy.net",
        user="root",
        password="fliqQyhKpLEGHtBTmujHlcfViLJsjYOl",
        database="railway",
        port=37639,
        cursorclass=pymysql.cursors.DictCursor
    )