# -*- coding: utf-8 -*-

import logging
import time
from odoo import http
from odoo.http import request, Response
import json

_logger = logging.getLogger(__name__)

class ProgressBarController(http.Controller):
    # Almacenamos el progreso por sesión
    _progress_data = {}
    _progress_history = {}

    def _get_progress_data(self, session_id):
        if session_id not in self._progress_data:
            self._progress_data[session_id] = {
                'progress': 0,
                'message': 'Iniciando...',
                'total': 0,
                'current': 0,
                'start_time': time.time(),
                'last_update': time.time(),
                'speed': 0,
                'eta': 0
            }
            # Inicializar historial de velocidad
            self._progress_history[session_id] = []
        return self._progress_data[session_id]

    @http.route(['/import/reset_progress'], type='json', auth='user', methods=['POST'], csrf=False, website=True)
    def reset_progress(self, **post):
        """
        Reinicia el progreso de la importación
        """
        try:
            session_id = request.session.sid
            if session_id in self._progress_data:
                del self._progress_data[session_id]
            if session_id in self._progress_history:
                del self._progress_history[session_id]
            _logger.info(f"Progreso reiniciado para la sesión {session_id}")
            return {'status': 'ok'}
        except Exception as e:
            _logger.error(f"Error al reiniciar progreso: {str(e)}")
            return {'status': 'error', 'message': str(e)}

    @http.route(['/import/update_progress'], type='json', auth='user', methods=['POST'], csrf=False, website=True)
    def update_import_progress(self, **post):
        """
        Actualiza el progreso de la importación con cálculos de velocidad y ETA
        """
        try:
            session_id = request.session.sid
            progress_data = self._get_progress_data(session_id)
            now = time.time()
            
            # Actualizar solo los campos proporcionados
            for key in ['progress', 'message', 'total', 'current', 'current_files', 'total_files']:
                if key in post and post[key] is not None:
                    progress_data[key] = post[key]
            
            # Calcular progreso si no se proporciona
            if 'progress' not in progress_data or progress_data['progress'] is None:
                if 'total' in progress_data and 'current' in progress_data:
                    total = float(progress_data['total'] or 1)  # Evitar división por cero
                    current = float(progress_data['current'] or 0)
                    progress = min(100.0, (current / total) * 100.0)
                    progress_data['progress'] = round(progress, 2)  # Redondear a 2 decimales
            
            # Calcular velocidad (unidades por segundo)
            if 'current' in post and progress_data['current'] > 0:
                time_elapsed = now - progress_data['start_time']
                if time_elapsed > 0:
                    speed = progress_data['current'] / time_elapsed
                    # Usar promedio móvil para suavizar la velocidad
                    self._progress_history[session_id].append(speed)
                    if len(self._progress_history[session_id]) > 5:  # Mantener solo los últimos 5 valores
                        self._progress_history[session_id].pop(0)
                    
                    if self._progress_history[session_id]:
                        avg_speed = sum(self._progress_history[session_id]) / len(self._progress_history[session_id])
                        progress_data['speed'] = round(avg_speed, 2)
                        
                        # Calcular ETA
                        if avg_speed > 0 and 'total' in progress_data and progress_data['total'] > 0:
                            remaining = max(0, progress_data['total'] - progress_data['current'])
                            progress_data['eta'] = int(remaining / avg_speed)  # en segundos
            
            progress_data['last_update'] = now
            progress_data['elapsed'] = int(now - progress_data['start_time'])
            
            # Asegurarse de que los contadores de archivos estén presentes
            if 'current_files' not in progress_data:
                progress_data['current_files'] = progress_data.get('current', 0)
            if 'total_files' not in progress_data:
                progress_data['total_files'] = progress_data.get('total', 0)
            
            _logger.debug(f"Progreso actualizado para sesión {session_id}: {progress_data}")
            return progress_data  # Devolver todos los datos de progreso
            
        except Exception as e:
            _logger.error(f"Error al actualizar progreso: {str(e)}")
            return {'status': 'error', 'message': str(e)}

    @http.route(['/import/progress'], type='json', auth='user', methods=['POST'], csrf=False, website=True)
    def get_import_progress(self, **post):
        """
        Obtiene el progreso actual de la importación
        """
        try:
            session_id = request.session.sid
            if session_id not in self._progress_data:
                return {
                    'status': 'not_started',
                    'progress': 0,
                    'message': 'Esperando inicio de importación...',
                    'eta': 0,
                    'speed': 0
                }
            
            progress_data = self._get_progress_data(session_id)
            
            # Preparar datos de respuesta
            response = {
                'status': 'in_progress',
                'progress': progress_data.get('progress', 0),
                'message': progress_data.get('message', ''),
                'current': progress_data.get('current', 0),
                'total': progress_data.get('total', 0),
                'eta': progress_data.get('eta', 0),
                'speed': progress_data.get('speed', 0),
                'elapsed': progress_data.get('elapsed', 0),
                'current_files': progress_data.get('current_files', 0),
                'total_files': progress_data.get('total_files', 0)
            }
            
            # Si el progreso es 100%, marcamos como completado
            if response['progress'] >= 100:
                response['status'] = 'completed'
                response['message'] = 'Importación completada con éxito'
                
            return response
            
        except Exception as e:
            _logger.error(f"Error al obtener progreso: {str(e)}")
            return {
                'status': 'error',
                'message': str(e),
                'progress': 0
            }
