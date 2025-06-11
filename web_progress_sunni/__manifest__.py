{
    'name': 'Web Progress Sunni',
    'version': '1.0',
    'author': 'Anderson Chasiloa',
    'category': 'Tools',
    'summary': 'Sobrescribe mensaje de carga en importador base_import con barra de progreso',
    'depends': ['base_import', 'web'],
    'data': [],
    'assets': {
        'web.assets_backend': [
            'web_progress_sunni/static/src/scss/import_progress_bar.scss',
            'web_progress_sunni/static/src/js/import_action_extension.js',
        ],
    },
    'installable': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
