import os
from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'templates'),
        static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'static')
    )

    CORS(app)

    from backend.routes.api_routes import api_bp
    from backend.routes.view_routes import view_bp

    app.register_blueprint(api_bp)
    app.register_blueprint(view_bp)

    return app
