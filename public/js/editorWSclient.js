var Cursor = (function(editor) {
    var ws = this;
    var obj = {};
    var contentEditable = editor.el.children[0];
    var editorRect = contentEditable.getBoundingClientRect();

    // returns caret coordinates
    var getCoords = function() {
        var x = 0;
        var y = 0;
        var sel = window.getSelection();

        if(sel.rangeCount) {
            var range = sel.getRangeAt(0).cloneRange();
            if(range.getClientRects()) {
                range.collapse(true);

                var rect = range.getClientRects()[0];

                if(rect) {
                    y = rect.top;
                    x = rect.left;
                }
            }
        }

        if (! x && ! y) {
            var next = null;
            
            if (next = range?.startContainer.parentNode) {
                [x, y] = [next.offsetLeft, next.offsetTop];
                return { x, y };
            }
            
        }

        return {
            x: x - editorRect.left,
            y: y - editorRect.top
        };
    }

    var userCaret = document.createElement('div');
    userCaret.classList.add('user-caret');

    var changeSelectionItems = function() {
        var childrens = contentEditable.querySelectorAll('a[href="selection"]');

        for (var i = 0; i < childrens.length; i ++) {
            // code...
            var child = childrens[i];
            if (! child.getAttribute('data-id')) {
                child.href = '';
                child.setAttribute('data-id', ws._uid);
                child.classList.add('own-selection');
            }
        }
    }

    var clearPreviousSelection = function() {
        var childrens = contentEditable.querySelectorAll('a[data-id]');

        for (var i = 0; i < childrens.length; i ++) {
            // code...
            var child = childrens[i];
            
            if (child.getAttribute('data-id') === ws._uid) {
                child.removeAttribute('a[data-id]');
                child.outerHTML = child.innerHTML;
            }
        }
    }

    var getSelectionRows = function() {
        var elements = Array.from(contentEditable.children);
        var finded = [];

        for (var i = 0; i < elements.length; i ++) {
            var child = elements[i];

            var selectionElements = child.querySelectorAll('a[data-id]');

            if (selectionElements.length) {
                var content = child.outerHTML;

                for (var j = 0; j < selectionElements.length; j ++) {
                    var selectionElement = selectionElements[j];

                    if (selectionElement.getAttribute('data-id') !== ws._uid) {
                        content = content.replace(selectionElement.outerHTML, '');
                    }
                }

                // Remove my own class
                content = content.replace('class="own-selection"', "");

                var index = elements.indexOf(child);
                finded.push({ index, content });
            }
        }  

        return finded;
    }

    // Dispose caret
    obj.dispose = function() {
        userCaret.remove();
    }

    // Update caret position
    obj.updateCursor = function(coords) {
        userCaret.style.left = coords.x + 'px';
        userCaret.style.top = coords.y + 'px';
    }

    // Update client selection
    obj.updateSelection = function(selectionObjects) {
        var elements = contentEditable.children;
        
        if (selectionObjects.length) {
            for (var i = 0; i < elements.length; i ++) {
                var replace = null;
                
                if (replace = selectionObjects.find(function(object) {
                    return object.index === i;
                })) 
                {
                   elements[i].outerHTML = replace.content;
                   continue;
                }
            }

            return ;
        }
        return clearPreviousSelection();
    }

    var startCaretInterception = function() {
        contentEditable.addEventListener('click', function(event) {
            var caretCoordinates = getCoords();
            ws.send('ON_CURSOR_UPDATE', caretCoordinates);
        });

        contentEditable.addEventListener('keydown', function() {
            setTimeout(function() {
                var caretCoordinates = getCoords();
                ws.send('ON_CURSOR_UPDATE', caretCoordinates);
            }, 10);
        });

        var selectionControl = true;
        var selectionEndTimeout = null;
    
        document.addEventListener('selectionchange', function onSelection(event) {
            var currentSelection = window.getSelection();
            var currentRange = currentSelection.getRangeAt(0);

            console.log(currentSelection)

            // Unselecting event
            if (currentRange.startOffset === currentRange.endOffset) {
                clearPreviousSelection();
                ws.send('ON_SELECTION', []);
            } 

            else if (selectionControl) {

                if (selectionEndTimeout) {
                    clearTimeout(selectionEndTimeout);
                }
            
                selectionEndTimeout = setTimeout(function () {
                    selectionControl = false;
                    
                    document.execCommand('createLink', false, 'selection');
                    changeSelectionItems();

                    var selectionObjects = getSelectionRows();
                    
                    if (selectionObjects.length) {
                        ws.send('ON_SELECTION', selectionObjects);
                    }
                    
                    setTimeout(function() {
                        selectionControl = true;
                    }, 1);

                }, 250);
            }
        })

    };

    // Temp: Simulation socket A <-> socket B communication
    contentEditable.appendChild(userCaret);
    
    // Start listen caret events
    startCaretInterception();

    return obj;
});

var StartEditorWSclient = (function (myEditor) {
    var obj = {};
    var socket = io();

    var cursor = Cursor.call(obj, myEditor);

    var startListening = function() {
        socket.on('ON_CURSOR_UPDATE', function(serverMessage) {
            cursor.updateCursor(serverMessage);
        });
    
        socket.on('ON_SELECTION', function(serverMessage) {
            cursor.updateSelection(serverMessage);
        });
    };

    obj._uid = jSuites.guid();

    obj.send = function(EVENT_NAME, _MESSAGE) {
        socket.emit(EVENT_NAME, _MESSAGE);
    };
    
    // Start listening ws messages  
    startListening();
});

