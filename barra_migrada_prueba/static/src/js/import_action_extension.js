    /** @odoo-module **/

import { registry } from '@web/core/registry';
import { ImportAction as BaseImportAction } from '@base_import/import_action/import_action';
import { _t } from '@web/core/l10n/translation';
import { ImportDataProgress } from '@base_import/import_data_progress/import_data_progress';
import { useService } from "@web/core/utils/hooks";

const { useRef, onMounted, onWillUnmount } = owl;

export class ImportAction extends BaseImportAction {
    setup() {
        super.setup();
        this.progress = 0;
        this.progressInterval = null;
        this.importInProgress = false;
        this.rpc = useService("rpc");
        // Usar la URL base de Odoo para las rutas
        this.baseUrl = window.location.origin;
        
        // Limpiar intervalo cuando el componente se destruya
        onWillUnmount(() => {
            this.cleanupProgressMonitoring();
        });
    }

    async makeRpcCall(url, params = {}) {
        try {
            // Asegurarse de que la URL comience con /
            const fullUrl = `${this.baseUrl}${url.startsWith('/') ? url : '/' + url}`;
            console.log(`Haciendo petición a: ${fullUrl}`, params);
            const response = await this.rpc(fullUrl, params);
            console.log('Respuesta recibida:', response);
            return response;
        } catch (error) {
            console.error(`Error en la petición a ${url}:`, error);
            throw error;
        }
    }

    async handleFilesUpload(files) {
        if (!files || files.length <= 0) {
            return;
        }

        this.state.filename = files[0].name;
        this.state.importMessages = [];
        this.importInProgress = true;

        // Crear elementos del DOM
        const progressContainer = document.createElement('div');
        progressContainer.className = 'import-progress-container';

        // Botón del menú
        const menuButton = document.createElement('div');
        menuButton.className = 'menu-button';

        // Menú desplegable
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';

        // Opciones del menú
        const optionA = document.createElement('div');
        optionA.className = 'menu-item';
        optionA.textContent = 'Standar';

        const optionB = document.createElement('div');
        optionB.className = 'menu-item';
        optionB.textContent = 'Nyancat';

        const optionC = document.createElement('div');
        optionC.className = 'menu-item';
        optionC.textContent = 'Modern';

        dropdownMenu.appendChild(optionA);
        dropdownMenu.appendChild(optionB);
        dropdownMenu.appendChild(optionC);

        // Contenido principal
        const message = document.createElement('div');
        message.className = 'import-message';
        message.textContent = _t("Subiendo archivo...");

        // Contenedor para el porcentaje estándar (solo para la vista estándar)
        const standardPercentageContainer = document.createElement('div');
        standardPercentageContainer.className = 'standard-percentage-container';
        standardPercentageContainer.style.display = 'none'; // Oculto por defecto
        
        const standardPercentage = document.createElement('div');
        standardPercentage.className = 'standard-percentage';
        standardPercentage.textContent = '0%';
        standardPercentageContainer.appendChild(standardPercentage);

        // Barra de progreso Nyancat (por defecto)
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressEl = document.createElement('div');
        progressEl.className = 'progress';
        progressBar.appendChild(progressEl);

        const nyanCat = document.createElement('img');
        nyanCat.src = '/barra_migrada_prueba/static/src/img/nyanimated.gif';
        nyanCat.className = 'nyan-cat';
        progressBar.appendChild(nyanCat);

        const percentageEl = document.createElement('div');
        percentageEl.className = 'progress-percentage';
        percentageEl.textContent = '0%';

        // Barra de progreso Moderna (oculta por defecto)
        const modernBar = document.createElement('div');
        modernBar.className = 'modern-progress';
        modernBar.style.display = 'none';
        modernBar.style.height = '20px';
        modernBar.style.backgroundColor = '#f1f5f9';
        modernBar.style.borderRadius = '10px';
        modernBar.style.overflow = 'hidden';
        modernBar.style.marginTop = '10px';
        modernBar.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)';
        
        const modernProgressFill = document.createElement('div');
        modernProgressFill.className = 'modern-progress-fill';
        modernProgressFill.style.height = '100%';
        modernProgressFill.style.width = '0%';
        modernProgressFill.style.background = 'linear-gradient(90deg, #4a6cf7 0%, #a855f7 50%, #e91e63 100%)';
        modernProgressFill.style.backgroundSize = '200% 100%';
        modernProgressFill.style.transition = 'width 0.3s ease, background 0.3s ease';
        modernProgressFill.style.borderRadius = '10px';
        modernProgressFill.style.position = 'relative';
        modernProgressFill.style.overflow = 'hidden';
        modernBar.appendChild(modernProgressFill);

        // Añadir animación de brillo
        const shine = document.createElement('div');
        shine.style.position = 'absolute';
        shine.style.top = '0';
        shine.style.left = '-100%';
        shine.style.width = '50%';
        shine.style.height = '100%';
        shine.style.background = 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)';
        shine.style.animation = 'shine 2s infinite';
        modernProgressFill.appendChild(shine);

        const modernPercentage = document.createElement('div');
        modernPercentage.className = 'modern-percentage';
        modernPercentage.textContent = '0%';
        modernPercentage.style.display = 'none';
        modernPercentage.style.textAlign = 'center';
        modernPercentage.style.marginTop = '8px';
        modernPercentage.style.fontSize = '14px';
        modernPercentage.style.fontWeight = '600';
        modernPercentage.style.color = '#4a6cf7';

        // Agregar contador de archivos
        let fileCounter = progressContainer.querySelector('.file-counter');
        if (!fileCounter) {
            fileCounter = document.createElement('div');
            fileCounter.className = 'file-counter';
            fileCounter.setAttribute('style', 
                'margin-top: 10px !important; ' +
                'margin-bottom: 5px !important; ' +
                'font-size: 14px !important; ' +
                'font-weight: bold !important; ' +
                'color: #666 !important; ' +
                'text-align: center !important; ' +
                'width: 100% !important;');
        }

        // Añadimos todo al contenedor
        progressContainer.appendChild(menuButton);
        progressContainer.appendChild(dropdownMenu);
        progressContainer.appendChild(message);
        progressContainer.appendChild(standardPercentageContainer);  // Añadir el contenedor del porcentaje
        progressContainer.appendChild(progressBar);
        
        // Mover el contador justo después de la barra de progreso
        if (fileCounter && fileCounter.parentNode) {
            fileCounter.parentNode.removeChild(fileCounter);
            progressBar.parentNode.insertBefore(fileCounter, progressBar.nextSibling);
        }
        
        progressContainer.appendChild(percentageEl);
        progressContainer.appendChild(modernBar);
        progressContainer.appendChild(modernPercentage);

        document.body.appendChild(progressContainer);

        // Variables para el progreso
        let currentProgress = 0;
        let progressInterval;
        let isUploadComplete = false;
        const progressBarWidth = 600;
        const nyanCatWidth = 90;
        const halfCatWidth = nyanCatWidth / 2;
        let lastUpdateTime = 0;
        const minUpdateInterval = 50;
        
        // Variables para el tiempo estimado
        let startTime = Date.now();
        let lastProgressTime = startTime;
        let estimatedTimeRemaining = "Calculando...";
        let lastProgress = 0;

        // Función para calcular el tiempo estimado restante
        const calculateEstimatedTime = (currentProgress) => {
            const now = Date.now();
            const elapsedTime = (now - startTime) / 1000; // en segundos
            
            if (currentProgress <= 0 || currentProgress >= 95) {
                return currentProgress >= 95 ? "Finalizando..." : "Iniciando...";
            }
            
            if (elapsedTime > 1 && currentProgress > 5) {
                const progressPerSecond = currentProgress / elapsedTime;
                
                if (progressPerSecond > 0) {
                    const remainingProgress = 100 - currentProgress;
                    const estimatedSeconds = remainingProgress / progressPerSecond;
                    
                    if (estimatedSeconds > 0) {
                        const minutes = Math.floor(estimatedSeconds / 60);
                        const seconds = Math.ceil(estimatedSeconds % 60);
                        
                        if (minutes > 0) {
                            return `${minutes}m ${seconds}s`;
                        } else {
                            return `${seconds}s`;
                        }
                    }
                }
            }
            
            return "Un momento...";
        };

        // Función para calcular el incremento de progreso basado en el tiempo
        const calculateIncrement = (targetProgress) => {
            const now = Date.now();
            if (now - lastUpdateTime < minUpdateInterval) {
                return currentProgress;
            }
            lastUpdateTime = now;
            
            if (isUploadComplete) {
                const remaining = 100 - currentProgress;
                return currentProgress + Math.max(0.5, remaining * 0.1);
            }
            
            return currentProgress + (0.2 + Math.random() * 0.3);
        };

        // Función para actualizar la barra de progreso de Nyancat
        const updateProgressNyancat = (targetProgress) => {
            currentProgress = Math.min(targetProgress, 100);
            
            // Actualizar porcentaje estándar
            standardPercentage.textContent = `${Math.round(currentProgress)}%`;
            
            let maxBarWidth = progressBarWidth - halfCatWidth;
            let progressWidthPx = (currentProgress / 100) * maxBarWidth;
            let progressWidthPercent = (progressWidthPx / progressBarWidth) * 100;

            progressEl.style.width = `${progressWidthPercent}%`;
            
            // Actualizar porcentaje en todas las vistas
            const percentageText = `${Math.round(currentProgress)}%`;
            percentageEl.textContent = percentageText;
            modernPercentage.textContent = percentageText;
            modernProgressFill.style.width = `${progressWidthPercent}%`;

            // Actualizar tiempo estimado cada 500ms o cuando el progreso cambie significativamente
            const now = Date.now();
            if (now - lastProgressTime > 500 || Math.abs(currentProgress - lastProgress) > 5) {
                estimatedTimeRemaining = calculateEstimatedTime(currentProgress);
                lastProgressTime = now;
                lastProgress = currentProgress;
            }

            // Actualizar el elemento de tiempo estimado si existe, o crearlo
            let timeRemainingEl = progressContainer.querySelector('.time-remaining');
            if (!timeRemainingEl) {
                timeRemainingEl = document.createElement('div');
                timeRemainingEl.className = 'time-remaining';
                timeRemainingEl.style.cssText = `
                    text-align: center;
                    font-size: 12px;
                    color: white;
                    margin-top: 5px;
                    width: 100%;
                `;
                progressContainer.appendChild(timeRemainingEl);
            }
            timeRemainingEl.textContent = `Tiempo restante: ${estimatedTimeRemaining}`;

            // Posicionar el gato Nyancat
            let leftPx = progressWidthPx - halfCatWidth;
            if (leftPx < 0) leftPx = 0;
            if (leftPx > progressBarWidth - nyanCatWidth) leftPx = progressBarWidth - nyanCatWidth;

            nyanCat.style.left = `${leftPx}px`;

            if (currentProgress >= 100 && progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
        };

        // Función para animar el progreso
        const animateProgress = () => {
            const targetProgress = isUploadComplete ? 100 : 95;
            
            if (currentProgress < targetProgress) {
                const newProgress = calculateIncrement(targetProgress);
                updateProgressNyancat(newProgress);
            }
        };

        // Iniciar la animación del progreso
        progressInterval = setInterval(animateProgress, 16);
        lastUpdateTime = Date.now();

        // Event listeners para el menú
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });

        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Lógica de opciones del menú
        optionA.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            // Mostrar solo el porcentaje (vista estándar)
            progressContainer.classList.remove('modern-style');
            standardPercentageContainer.style.display = 'flex';  // Mostrar solo el porcentaje
            progressBar.style.display = 'none';
            percentageEl.style.display = 'none';
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
        });

        optionB.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            // Mostrar vista Nyancat (como estaba originalmente)
            progressContainer.classList.remove('modern-style');
            standardPercentageContainer.style.display = 'none';  // Ocultar el contenedor del porcentaje
            progressBar.style.display = '';  // Mostrar la barra Nyancat
            percentageEl.style.display = '';  // Mostrar el porcentaje de Nyancat
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
        });

        optionC.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            // Mostrar vista moderna (como estaba originalmente)
            progressContainer.classList.add('modern-style');
            standardPercentageContainer.style.display = 'none';  // Ocultar el contenedor del porcentaje
            progressBar.style.display = 'none';
            percentageEl.style.display = 'none';
            modernBar.style.display = 'block';  // Mostrar la barra moderna
            modernPercentage.style.display = 'block';  // Mostrar el porcentaje moderno
            
            // Asegurarse de que el tiempo estimado se muestre correctamente en la vista moderna
            const timeRemainingEl = progressContainer.querySelector('.time-remaining');
            if (timeRemainingEl) {
                timeRemainingEl.style.color = '#333';
                timeRemainingEl.style.textShadow = 'none';
            }
        });

        try {
            this.model.block();

            // Inicializar con estilo Nyancat por defecto (como estaba originalmente)
            progressContainer.classList.remove('modern-style');
            standardPercentageContainer.style.display = 'none';  // Ocultar el contenedor del porcentaje
            progressBar.style.display = '';  // Mostrar la barra Nyancat
            percentageEl.style.display = '';  // Mostrar el porcentaje de Nyancat
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
            
            // Verificar si el servidor está disponible
            try {
                // Primero intentamos reiniciar el progreso
                await this.makeRpcCall('/import/reset_progress', {});
                
                // Luego actualizamos el estado inicial
                await this.makeRpcCall('/import/update_progress', {
                    message: 'Preparando importación...',
                    progress: 0,
                    total: 100,
                    current: 0
                });
                
                // Si llegamos aquí, el servidor está disponible
                this.startProgressMonitoring(progressContainer);
                
            } catch (error) {
                console.warn('No se pudo conectar con el servidor de progreso. Usando modo simulado.', error);
                this.updateProgressUI(progressContainer, {
                    progress: 0,
                    message: 'Advertencia: No se pudo conectar con el servidor de progreso. Mostrando progreso simulado.'
                });
            }
            
            // Simular progreso de carga
            const simulateUpload = () => {
                return new Promise((resolve) => {
                    const uploadInterval = setInterval(() => {
                        if (currentProgress >= 95) {
                            clearInterval(uploadInterval);
                            isUploadComplete = true;
                            
                            // Esperar a que la animación llegue al 100%
                            const checkCompletion = setInterval(() => {
                                if (currentProgress >= 100) {
                                    clearInterval(checkCompletion);
                                    resolve();
                                }
                            }, 100);
                        }
                    }, 100);
                });
            };

            // Iniciar la carga del archivo
            const { res, error } = await this.model.updateData(true);
            
            // Marcar como completado y esperar a que la animación termine
            isUploadComplete = true;
            await new Promise(resolve => {
                const checkCompletion = setInterval(() => {
                    if (currentProgress >= 100) {
                        clearInterval(checkCompletion);
                        resolve();
                    }
                }, 100);
            });

            if (error) {
                this.state.previewError = error;
            } else {
                this.state.fileLength = res.file_length;
                this.state.previewError = undefined;
            }
        } finally {
            // Limpiar el intervalo si aún existe
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            
            this.model.unblock();
            
            // Limpiar el elemento de tiempo estimado
            const timeRemainingEl = progressContainer.querySelector('.time-remaining');
            if (timeRemainingEl && timeRemainingEl.parentNode) {
                timeRemainingEl.remove();
            }
            
            // Eliminar el contenedor después de un retraso
            setTimeout(() => {
                if (progressContainer && progressContainer.parentNode) {
                    progressContainer.remove();
                }
            }, 1000);
        }

        // Iniciar el monitoreo del progreso
        this.startProgressMonitoring(progressContainer);

        // Continuar con la lógica de importación existente
        try {
            await super.handleFilesUpload(files);
        } catch (error) {
            console.error('Error durante la importación:', error);
            this.updateProgressUI(progressContainer, {
                progress: 0,
                message: `Error: ${error.message || 'Error desconocido durante la importación'}`,
                error: true
            });
        } finally {
            this.cleanupProgressMonitoring();
        }
    }

    async handleImport(isTest = true) {
        if (!this.state.filename) {
            return;
        }

        // Crear elementos del DOM
        const progressContainer = document.createElement('div');
        progressContainer.className = 'import-progress-container';

        // Agregar contador de archivos para la barra de importación
        const fileCounter = document.createElement('div');
        fileCounter.className = 'file-counter';
        fileCounter.setAttribute('style', 
            'margin-top: 10px !important; ' +
            'margin-bottom: 5px !important; ' +
            'font-size: 14px !important; ' +
            'font-weight: bold !important; ' +
            'color: #666 !important; ' +
            'text-align: center !important; ' +
            'width: 100% !important;');

        // Botón del menú
        const menuButton = document.createElement('div');
        menuButton.className = 'menu-button';

        // Menú desplegable
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';

        // Opciones del menú
        const optionA = document.createElement('div');
        optionA.className = 'menu-item';
        optionA.textContent = 'Standar';

        const optionB = document.createElement('div');
        optionB.className = 'menu-item';
        optionB.textContent = 'Nyancat';

        const optionC = document.createElement('div');
        optionC.className = 'menu-item';
        optionC.textContent = 'Modern';

        dropdownMenu.appendChild(optionA);
        dropdownMenu.appendChild(optionB);
        dropdownMenu.appendChild(optionC);

        // Contenido principal
        const message = document.createElement('div');
        message.className = 'import-message';
        message.textContent = _t("Importando datos...");

        // Crear contenedor de porcentaje estándar (para el estilo estándar)
        const standardPercentageContainer = document.createElement('div');
        standardPercentageContainer.className = 'standard-percentage-container';
        standardPercentageContainer.style.display = 'none';
        standardPercentageContainer.style.justifyContent = 'center';
        standardPercentageContainer.style.alignItems = 'center';
        standardPercentageContainer.style.marginTop = '10px';
        progressContainer.appendChild(standardPercentageContainer);
        
        const standardPercentage = document.createElement('div');
        standardPercentage.className = 'standard-percentage';
        standardPercentage.textContent = '0%';
        standardPercentage.style.fontSize = '14px';
        standardPercentage.style.fontWeight = 'bold';
        standardPercentage.style.color = '#666';
        standardPercentageContainer.appendChild(standardPercentage);

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';

        const progressEl = document.createElement('div');
        progressEl.className = 'progress';

        progressBar.appendChild(progressEl);

        const percentageEl = document.createElement('div');
        percentageEl.className = 'progress-percentage';
        percentageEl.textContent = '0%';

        // Crear elementos para el estilo moderno
        const modernBar = document.createElement('div');
        modernBar.className = 'modern-progress';
        modernBar.style.display = 'none';
        modernBar.style.height = '20px';
        modernBar.style.backgroundColor = '#f1f5f9';
        modernBar.style.borderRadius = '10px';
        modernBar.style.overflow = 'hidden';
        modernBar.style.marginTop = '10px';
        modernBar.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)';
        progressContainer.appendChild(modernBar);

        const modernProgressFill = document.createElement('div');
        modernProgressFill.className = 'modern-progress-fill';
        modernProgressFill.style.height = '100%';
        modernProgressFill.style.width = '0%';
        modernProgressFill.style.background = 'linear-gradient(90deg, #4a6cf7 0%, #a855f7 50%, #e91e63 100%)';
        modernProgressFill.style.backgroundSize = '200% 100%';
        modernProgressFill.style.transition = 'width 0.3s ease, background 0.3s ease';
        modernProgressFill.style.borderRadius = '10px';
        modernProgressFill.style.position = 'relative';
        modernProgressFill.style.overflow = 'hidden';
        modernBar.appendChild(modernProgressFill);

        // Añadir animación de brillo
        const shine = document.createElement('div');
        shine.style.position = 'absolute';
        shine.style.top = '0';
        shine.style.left = '-100%';
        shine.style.width = '50%';
        shine.style.height = '100%';
        shine.style.background = 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)';
        shine.style.animation = 'shine 2s infinite';
        modernProgressFill.appendChild(shine);

        const modernPercentage = document.createElement('div');
        modernPercentage.className = 'modern-percentage';
        modernPercentage.textContent = '0%';
        modernPercentage.style.display = 'none';
        modernPercentage.style.textAlign = 'center';
        modernPercentage.style.marginTop = '8px';
        modernPercentage.style.fontSize = '14px';
        modernPercentage.style.fontWeight = '600';
        modernPercentage.style.color = '#4a6cf7';
        progressContainer.appendChild(modernPercentage);

        // Añadir elementos al contenedor en el orden correcto
        progressContainer.appendChild(menuButton);
        progressContainer.appendChild(dropdownMenu);
        progressContainer.appendChild(message);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(fileCounter);  // Contador de archivos debajo de la barra
        progressContainer.appendChild(percentageEl);

        document.body.appendChild(progressContainer);

        // Evento click menú: mostrar/ocultar dropdown
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });

        // Prevenir que los clics en el menú se propaguen al documento
        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Manejadores de eventos para las opciones del menú
        optionA.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            progressContainer.classList.remove('modern-style');
            progressBar.style.display = 'none';
            percentageEl.style.display = 'none';
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
            standardPercentageContainer.style.display = 'flex';
            fileCounter.style.display = 'block';
        });

        optionB.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            progressContainer.classList.remove('modern-style');
            progressBar.style.display = 'block';
            percentageEl.style.display = 'block';
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
            standardPercentageContainer.style.display = 'none';
            fileCounter.style.display = 'block';
        });

        optionC.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            progressContainer.classList.add('modern-style');
            progressBar.style.display = 'none';
            percentageEl.style.display = 'none';
            modernBar.style.display = 'block';
            modernPercentage.style.display = 'block';
            standardPercentageContainer.style.display = 'none';
            fileCounter.style.display = 'block';
        });

        // Establecer estilo por defecto (Nyancat)
        progressBar.style.display = 'block';
        percentageEl.style.display = 'block';
        modernBar.style.display = 'none';
        modernPercentage.style.display = 'none';
        standardPercentageContainer.style.display = 'none';

        // Variables para el progreso
        let currentProgress = 0;
        let progressInterval;
        const progressBarWidth = 600;
        const nyanCatWidth = 90;
        const halfCatWidth = nyanCatWidth / 2;
        let isImportComplete = false;

        // Función para actualizar la barra de progreso
        const updateProgress = (progressData) => {
            // Actualizar el contador de archivos si está disponible en la respuesta
            if (progressData.current_files !== undefined && progressData.total_files !== undefined) {
                fileCounter.textContent = `${progressData.current_files} de ${progressData.total_files} archivos importados`;
            } else if (progressData.current !== undefined && progressData.total !== undefined) {
                // Alternativa: usar los contadores existentes si no hay contadores específicos de archivos
                fileCounter.textContent = `${progressData.current} de ${progressData.total} archivos importados`;
            }
            
            this.updateProgressUI(progressContainer, {
                progress: progressData.progress || 0,
                message: progressData.message || 'Importando...',
                error: false,
                status: 'in_progress',
                eta: progressData.eta || 0,
                speed: progressData.speed || 0,
                current: progressData.current || 0,
                total: progressData.total || 100,
                elapsed: progressData.elapsed || 0
            });
        };

        // Iniciar la actualización del progreso
        progressInterval = setInterval(() => {
            if (currentProgress < 90) { // Llegar hasta 90% durante la importación
                updateProgress({
                    progress: currentProgress,
                    current_files: currentProgress,
                    total_files: 100,
                });
                currentProgress++;
            }
        }, 100);

        try {
            // Bloquear la interfaz
            this.model.block();

            // Actualizar progreso inicial
            updateProgress({
                progress: 0,
                current_files: 0,
                total_files: 100,
            });

            // Iniciar la importación
            const importPromise = super.handleImport(isTest);
            
            // Esperar a que la importación se complete
            const result = await importPromise;
            
            // Completar el progreso hasta 100%
            updateProgress({
                progress: 100,
                current_files: 100,
                total_files: 100,
            });
            isImportComplete = true;

            if (!isTest) {
                this.notification.add(_t("Importación completada exitosamente"), {
                    type: "success",
                });
            }

            return result;

        } catch (error) {
            console.error('Error durante la importación:', error);
            this.notification.add(_t("Error durante la importación: ") + (error.message || error), {
                type: "danger",
            });
            throw error;
        } finally {
            // Asegurarse de que el progreso llegue al 100% si hay algún error
            if (currentProgress < 100) {
                updateProgress({
                    progress: 100,
                    current_files: 100,
                    total_files: 100,
                });
            }
            
            // Limpiar el intervalo si aún existe
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            
            // Desbloquear la interfaz
            this.model.unblock();
            
            // Eliminar el contenedor de progreso después de un retraso
            setTimeout(() => {
                if (progressContainer && progressContainer.parentNode) {
                    progressContainer.remove();
                }
            }, 1000);
        }
    }

    cleanupProgressMonitoring() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
            console.log('Intervalo de monitoreo limpiado');
        }
    }

    startProgressMonitoring(container) {
        // Limpiar cualquier intervalo existente
        this.cleanupProgressMonitoring();
        
        // Crear un nuevo intervalo
        this.progressInterval = setInterval(async () => {
            try {
                const progress = await this.makeRpcCall('/import/progress', {});
                this.updateProgressUI(container, progress);
                
                // Si la importación ha terminado, limpiar el intervalo
                if (progress.progress >= 100 || !this.importInProgress) {
                    this.cleanupProgressMonitoring();
                }
            } catch (error) {
                console.error('Error al obtener el progreso:', error);
                this.cleanupProgressMonitoring();
            }
        }, 500); // Consultar cada 500ms
    }

    updateProgressUI(container, { 
        progress = 0, 
        message = 'Subiendo archivo...', 
        error = false, 
        status = 'in_progress',
        eta = 0,
        speed = 0,
        current = 0,
        total = 0,
        elapsed = 0
    }) {
        const progressBar = container.querySelector('.progress');
        const progressBarContainer = container.querySelector('.progress-bar'); // Contenedor principal
        const nyanCat = container.querySelector('.nyan-cat');
        const percentageEl = container.querySelector('.progress-percentage');
        const messageEl = container.querySelector('.import-message');
        const standardPercentageEl = container.querySelector('.standard-percentage');
        const modernProgressFill = container.querySelector('.modern-progress-fill');
        const modernPercentage = container.querySelector('.modern-percentage');
        
        const isModernStyle = container.classList.contains('modern-style');
        const isStandardStyle = container.querySelector('.standard-percentage-container') && 
                             container.querySelector('.standard-percentage-container').style.display === 'flex';

        // Actualizar el progreso
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            
            if (status === 'completed') {
                progressBar.style.width = '100%';
                progressBar.classList.add('completed');
                
                // Esperar a que termine la animación antes de ocultar
                setTimeout(() => {
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                }, 1500);
            }
        }

        // Actualizar la barra de progreso moderna si está visible
        if (modernProgressFill && isModernStyle) {
            modernProgressFill.style.width = `${progress}%`;
            
            // Cambiar el color según el progreso
            if (progress < 30) {
                modernProgressFill.style.background = 'linear-gradient(90deg, #ff4d4f 0%, #ff7a45 100%)';
            } else if (progress < 70) {
                modernProgressFill.style.background = 'linear-gradient(90deg, #ffa940 0%, #faad14 100%)';
            } else {
                modernProgressFill.style.background = 'linear-gradient(90deg, #52c41a 0%, #389e0d 100%)';
            }
            
            // Asegurar que la animación de brillo siga funcionando
            modernProgressFill.style.backgroundSize = '200% 100%';
            modernProgressFill.style.animation = 'gradientShift 3s ease infinite';
        }

        // Actualizar el porcentaje en todos los contenedores visibles
        const percentageText = `${Math.round(progress)}%`;
        
        // Actualizar porcentaje moderno si está visible
        if (modernPercentage && isModernStyle) {
            modernPercentage.textContent = percentageText;
            modernPercentage.style.display = 'block';
        }
        
        // Actualizar porcentaje estándar si está visible
        if (standardPercentageEl && isStandardStyle) {
            standardPercentageEl.textContent = percentageText;
        }
        
        // Actualizar porcentaje normal
        if (percentageEl) {
            percentageEl.textContent = percentageText;
        }

        // Actualizar el mensaje
        if (messageEl) {
            if (isStandardStyle) {
                // Ocultar completamente el mensaje en estilo estándar
                messageEl.style.display = 'none';
            } else if (status !== 'completed') {
                // Mostrar mensaje en otros estilos
                messageEl.style.display = '';
                messageEl.textContent = isModernStyle ? 'Importando...' : 'Subiendo archivo...';
                // Color negro para estilo moderno, blanco para Nyancat
                messageEl.style.color = isModernStyle ? '#000000' : (error ? '#dc3545' : 'white');
            } else {
                messageEl.textContent = '¡Importación completada!';
            }
        }
    }

    async handleImport(isTest = true) {
        if (!this.state.filename) {
            return;
        }

        // Crear elementos del DOM
        const progressContainer = document.createElement('div');
        progressContainer.className = 'import-progress-container';

        // Agregar contador de archivos para la barra de importación
        const fileCounter = document.createElement('div');
        fileCounter.className = 'file-counter';
        fileCounter.setAttribute('style', 
            'margin-top: 10px !important; ' +
            'margin-bottom: 5px !important; ' +
            'font-size: 14px !important; ' +
            'font-weight: bold !important; ' +
            'color: #666 !important; ' +
            'text-align: center !important; ' +
            'width: 100% !important;');

        // Botón del menú
        const menuButton = document.createElement('div');
        menuButton.className = 'menu-button';

        // Menú desplegable
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';

        // Opciones del menú
        const optionA = document.createElement('div');
        optionA.className = 'menu-item';
        optionA.textContent = 'Standar';

        const optionB = document.createElement('div');
        optionB.className = 'menu-item';
        optionB.textContent = 'Nyancat';

        const optionC = document.createElement('div');
        optionC.className = 'menu-item';
        optionC.textContent = 'Modern';

        dropdownMenu.appendChild(optionA);
        dropdownMenu.appendChild(optionB);
        dropdownMenu.appendChild(optionC);

        // Contenido principal
        const message = document.createElement('div');
        message.className = 'import-message';
        message.textContent = _t("Importando datos...");

        // Crear contenedor de porcentaje estándar (para el estilo estándar)
        const standardPercentageContainer = document.createElement('div');
        standardPercentageContainer.className = 'standard-percentage-container';
        standardPercentageContainer.style.display = 'none';
        standardPercentageContainer.style.justifyContent = 'center';
        standardPercentageContainer.style.alignItems = 'center';
        standardPercentageContainer.style.marginTop = '10px';
        progressContainer.appendChild(standardPercentageContainer);
        
        const standardPercentage = document.createElement('div');
        standardPercentage.className = 'standard-percentage';
        standardPercentage.textContent = '0%';
        standardPercentage.style.fontSize = '14px';
        standardPercentage.style.fontWeight = 'bold';
        standardPercentage.style.color = '#666';
        standardPercentageContainer.appendChild(standardPercentage);

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';

        const progressEl = document.createElement('div');
        progressEl.className = 'progress';

        progressBar.appendChild(progressEl);

        const percentageEl = document.createElement('div');
        percentageEl.className = 'progress-percentage';
        percentageEl.textContent = '0%';

        // Crear elementos para el estilo moderno
        const modernBar = document.createElement('div');
        modernBar.className = 'modern-progress';
        modernBar.style.display = 'none';
        modernBar.style.height = '20px';
        modernBar.style.backgroundColor = '#f1f5f9';
        modernBar.style.borderRadius = '10px';
        modernBar.style.overflow = 'hidden';
        modernBar.style.marginTop = '10px';
        modernBar.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)';
        progressContainer.appendChild(modernBar);

        const modernProgressFill = document.createElement('div');
        modernProgressFill.className = 'modern-progress-fill';
        modernProgressFill.style.height = '100%';
        modernProgressFill.style.width = '0%';
        modernProgressFill.style.background = 'linear-gradient(90deg, #4a6cf7 0%, #a855f7 50%, #e91e63 100%)';
        modernProgressFill.style.backgroundSize = '200% 100%';
        modernProgressFill.style.transition = 'width 0.3s ease, background 0.3s ease';
        modernProgressFill.style.borderRadius = '10px';
        modernProgressFill.style.position = 'relative';
        modernProgressFill.style.overflow = 'hidden';
        modernBar.appendChild(modernProgressFill);

        // Añadir animación de brillo
        const shine = document.createElement('div');
        shine.style.position = 'absolute';
        shine.style.top = '0';
        shine.style.left = '-100%';
        shine.style.width = '50%';
        shine.style.height = '100%';
        shine.style.background = 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)';
        shine.style.animation = 'shine 2s infinite';
        modernProgressFill.appendChild(shine);

        const modernPercentage = document.createElement('div');
        modernPercentage.className = 'modern-percentage';
        modernPercentage.textContent = '0%';
        modernPercentage.style.display = 'none';
        modernPercentage.style.textAlign = 'center';
        modernPercentage.style.marginTop = '8px';
        modernPercentage.style.fontSize = '14px';
        modernPercentage.style.fontWeight = '600';
        modernPercentage.style.color = '#4a6cf7';
        progressContainer.appendChild(modernPercentage);

        // Añadir elementos al contenedor en el orden correcto
        progressContainer.appendChild(menuButton);
        progressContainer.appendChild(dropdownMenu);
        progressContainer.appendChild(message);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(fileCounter);  // Contador de archivos debajo de la barra
        progressContainer.appendChild(percentageEl);

        document.body.appendChild(progressContainer);

        // Evento click menú: mostrar/ocultar dropdown
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });

        // Prevenir que los clics en el menú se propaguen al documento
        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Manejadores de eventos para las opciones del menú
        optionA.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            progressContainer.classList.remove('modern-style');
            progressBar.style.display = 'none';
            percentageEl.style.display = 'none';
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
            standardPercentageContainer.style.display = 'flex';
            fileCounter.style.display = 'block';
        });

        optionB.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            progressContainer.classList.remove('modern-style');
            progressBar.style.display = 'block';
            percentageEl.style.display = 'block';
            modernBar.style.display = 'none';
            modernPercentage.style.display = 'none';
            standardPercentageContainer.style.display = 'none';
            fileCounter.style.display = 'block';
        });

        optionC.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            progressContainer.classList.add('modern-style');
            progressBar.style.display = 'none';
            percentageEl.style.display = 'none';
            modernBar.style.display = 'block';
            modernPercentage.style.display = 'block';
            standardPercentageContainer.style.display = 'none';
            fileCounter.style.display = 'block';
        });

        // Establecer estilo por defecto (Nyancat)
        progressBar.style.display = 'block';
        percentageEl.style.display = 'block';
        modernBar.style.display = 'none';
        modernPercentage.style.display = 'none';
        standardPercentageContainer.style.display = 'none';

        // Variables para el progreso
        let currentProgress = 0;
        let progressInterval;
        const progressBarWidth = 600;
        const nyanCatWidth = 90;
        const halfCatWidth = nyanCatWidth / 2;
        let isImportComplete = false;

        // Función para actualizar la barra de progreso
        const updateProgress = (progressData) => {
            // Actualizar el contador de archivos si está disponible en la respuesta
            if (progressData.current_files !== undefined && progressData.total_files !== undefined) {
                fileCounter.textContent = `${progressData.current_files} de ${progressData.total_files} archivos importados`;
            } else if (progressData.current !== undefined && progressData.total !== undefined) {
                // Alternativa: usar los contadores existentes si no hay contadores específicos de archivos
                fileCounter.textContent = `${progressData.current} de ${progressData.total} archivos importados`;
            }
            
            this.updateProgressUI(progressContainer, {
                progress: progressData.progress || 0,
                message: progressData.message || 'Importando...',
                error: false,
                status: 'in_progress',
                eta: progressData.eta || 0,
                speed: progressData.speed || 0,
                current: progressData.current || 0,
                total: progressData.total || 100,
                elapsed: progressData.elapsed || 0
            });
        };

        // Iniciar la actualización del progreso
        progressInterval = setInterval(() => {
            if (currentProgress < 90) { // Llegar hasta 90% durante la importación
                updateProgress({
                    progress: currentProgress,
                    current_files: currentProgress,
                    total_files: 100,
                });
                currentProgress++;
            }
        }, 100);

        try {
            // Bloquear la interfaz
            this.model.block();

            // Actualizar progreso inicial
            updateProgress({
                progress: 0,
                current_files: 0,
                total_files: 100,
            });

            // Iniciar la importación
            const importPromise = super.handleImport(isTest);
            
            // Esperar a que la importación se complete
            const result = await importPromise;
            
            // Completar el progreso hasta 100%
            updateProgress({
                progress: 100,
                current_files: 100,
                total_files: 100,
            });
            isImportComplete = true;

            if (!isTest) {
                this.notification.add(_t("Importación completada exitosamente"), {
                    type: "success",
                });
            }

            return result;

        } catch (error) {
            console.error('Error durante la importación:', error);
            this.notification.add(_t("Error durante la importación: ") + (error.message || error), {
                type: "danger",
            });
            throw error;
        } finally {
            // Asegurarse de que el progreso llegue al 100% si hay algún error
            if (currentProgress < 100) {
                updateProgress({
                    progress: 100,
                    current_files: 100,
                    total_files: 100,
                });
            }
            
            // Limpiar el intervalo si aún existe
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            
            // Desbloquear la interfaz
            this.model.unblock();
            
            // Eliminar el contenedor de progreso después de un retraso
            setTimeout(() => {
                if (progressContainer && progressContainer.parentNode) {
                    progressContainer.remove();
                }
            }, 1000);
        }
    }

    async _importBatch(importId, batchIndex) {
        try {
            const result = await super._importBatch(importId, batchIndex);
            
            // Actualizar el progreso en el servidor
            if (result && result.total_rows && result.rows_imported) {
                await this.makeRpcCall('/import/update_progress', {
                    message: `Procesando filas... (${result.rows_imported}/${result.total_rows})`,
                    total: result.total_rows,
                    current: result.rows_imported
                });
            }
            
            return result;
        } catch (error) {
            console.error('Error en _importBatch:', error);
            throw error;
        }
    }

    async _onImportComplete() {
        try {
            await this.makeRpcCall('/import/update_progress', {
                progress: 100,
                message: 'Importación completada con éxito!'
            });
            
            // Pequeño retraso para mostrar el mensaje de finalización
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return await super._onImportComplete();
        } catch (error) {
            console.error('Error al finalizar la importación:', error);
            throw error;
        } finally {
            this.cleanupProgressMonitoring();
        }
    }

    destroy() {
        isDestroyed = true;
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
}

// Registrar el componente personalizado
registry.category('actions').add('import', ImportAction, { force: true });