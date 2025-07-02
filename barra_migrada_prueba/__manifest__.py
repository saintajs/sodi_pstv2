{
    'name': 'Barra Migrada Prueba',
    'version': '1.0',
    'category': 'Tools',
    'summary': 'Sobrescribe mensaje de carga en importador base_import con barra de progreso y personaliza el indicador de carga global',
    'description': """
        Módulo de prueba para implementar una barra de progreso en tiempo real
        durante la importación de datos.
    """,
    'depends': [
        'base',
        'web',
        'base_import',
    ],
    'data': [
        'views/templates.xml',  # Asegúrate de que exista este archivo en tu módulo
    ],
    'assets': {
        'web.assets_backend': [
            'barra_migrada_prueba/static/src/scss/import_progress_bar.scss',
            'barra_migrada_prueba/static/src/scss/custom_loading_indicator/custom_loading_indicator.scss',
            'barra_migrada_prueba/static/src/js/import_action_extension.js',
            'barra_migrada_prueba/static/src/xml/custom_loading_indicator.xml',
            'barra_migrada_prueba/static/src/js/custom_loading_indicator.js',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}

