from flask import Blueprint, render_template

view_bp = Blueprint('views', __name__)


@view_bp.route('/')
def index():
    return render_template('index.html')


@view_bp.route('/study')
def study():
    return render_template('study.html')


@view_bp.route('/summary')
def summary():
    return render_template('summary.html')
