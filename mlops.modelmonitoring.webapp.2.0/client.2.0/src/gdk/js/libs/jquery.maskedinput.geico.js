!function(factory) {
    "function" == typeof define && define.amd ? define([ "jquery" ], factory) : "object" == typeof exports ? factory(require("jquery")) : factory(jQuery);
}((function($) {
    var caretTimeoutId, ua = navigator.userAgent, iPhone = /iphone/i.test(ua), chrome = /chrome/i.test(ua), android = /android/i.test(ua);
    $.mask = {
        definitions: {
            9: "[0-9]",
            a: "[A-Za-z]",
            "*": "[A-Za-z0-9]"
        },
        autoclear: !1,
        dataName: "rawMaskFn",
        placeholder: "_"
    }, $.fn.extend({
        caret: function(begin, end) {
            var range;
            if (0 !== this.length && !this.is(":hidden") && this.get(0) === document.activeElement) return "number" == typeof begin ? (end = "number" == typeof end ? end : begin, 
            this.each((function() {
                this.setSelectionRange ? this.setSelectionRange(begin, end) : this.createTextRange && ((range = this.createTextRange()).collapse(!0), 
                range.moveEnd("character", end), range.moveStart("character", begin), range.select());
            }))) : (this[0].setSelectionRange ? (begin = this[0].selectionStart, end = this[0].selectionEnd) : document.selection && document.selection.createRange && (range = document.selection.createRange(), 
            begin = 0 - range.duplicate().moveStart("character", -1e5), end = begin + range.text.length), 
            {
                begin: begin,
                end: end
            });
        },
        unmask: function() {
            return this.trigger("unmask");
        },
        mask: function(mask, settings) {
            var defs, tests, partialPosition, firstNonMaskPos, lastRequiredNonMaskPos, len, oldVal;
            if (!mask && this.length > 0) {
                var fn = $(this[0]).data($.mask.dataName);
                return fn ? fn() : void 0;
            }
            return settings = $.extend({
                autoclear: $.mask.autoclear,
                placeholder: $.mask.placeholder,
                completed: null,
                dobYearPrefix: !1,
                autoPrefix: !0
            }, settings), defs = $.mask.definitions, tests = [], partialPosition = len = mask.length, 
            firstNonMaskPos = null, mask = String(mask), $.each(mask.split(""), (function(i, c) {
                "?" == c ? (len--, partialPosition = i) : defs[c] ? (tests.push(new RegExp(defs[c])), 
                null === firstNonMaskPos && (firstNonMaskPos = tests.length - 1), i < partialPosition && (lastRequiredNonMaskPos = tests.length - 1)) : tests.push(null);
            })), this.trigger("unmask").each((function() {
                var input = $(this), buffer = $.map(mask.split(""), (function(c, i) {
                    if ("?" != c) return defs[c] ? getPlaceholder(i) : c;
                })), defaultBuffer = buffer.join(""), focusText = input.val();
                function tryFireCompleted() {
                    if (settings.completed) {
                        for (var i = firstNonMaskPos; i <= lastRequiredNonMaskPos; i++) if (tests[i] && buffer[i] === getPlaceholder(i)) return;
                        settings.completed.call(input);
                    }
                }
                function getPlaceholder(i) {
                    return i < settings.placeholder.length ? settings.placeholder.charAt(i) : settings.placeholder.charAt(0);
                }
                function seekNext(pos) {
                    for (;++pos < len && !tests[pos]; ) ;
                    return pos;
                }
                function shiftL(begin, end) {
                    var i, j;
                    if (!(begin < 0)) {
                        for (i = begin, j = seekNext(end); i < len; i++) if (tests[i]) {
                            if (!(j < len && tests[i].test(buffer[j]))) break;
                            buffer[i] = buffer[j], buffer[j] = getPlaceholder(j), j = seekNext(j);
                        }
                        writeBuffer(), input.caret(Math.max(firstNonMaskPos, begin));
                    }
                }
                function blurEvent(e) {
                    checkVal(), input.val() != focusText && input.change();
                }
                function clearBuffer(start, end) {
                    var i;
                    for (i = start; i < end && i < len; i++) tests[i] && (buffer[i] = getPlaceholder(i));
                }
                function writeBuffer() {
                    input.val(buffer.join(""));
                }
                function checkVal(allow) {
                    var i, c, pos, test = input.val(), lastMatch = -1;
                    for (i = 0, pos = 0; i < len; i++) if (tests[i]) {
                        for (buffer[i] = getPlaceholder(i); pos++ < test.length; ) if (c = test.charAt(pos - 1), 
                        tests[i].test(c)) {
                            buffer[i] = c, lastMatch = i;
                            break;
                        }
                        if (pos > test.length) {
                            clearBuffer(i + 1, len);
                            break;
                        }
                    } else buffer[i] === test.charAt(pos) && pos++, i < partialPosition && (lastMatch = i);
                    return allow ? writeBuffer() : lastMatch + 1 < partialPosition ? settings.autoclear || buffer.join("") === defaultBuffer ? (input.val() && input.val(""), 
                    clearBuffer(0, len)) : writeBuffer() : (writeBuffer(), input.val(input.val().substring(0, lastMatch + 1))), 
                    partialPosition ? i : firstNonMaskPos;
                }
                function resetFocus(e, charArray) {
                    e.currentTarget.value = charArray.join(""), e.currentTarget.blur(), e.currentTarget.focus();
                }
                function prefixLogic(yrcharpos1, yrcharpos2, yrcharpos3, yrcharpos4, e) {
                    if (e.which >= 48 && e.which <= 57 || e.which >= 96 && e.which <= 105) {
                        var charArray = e.currentTarget.value.split("");
                        setTimeout((function() {
                            if (charArray[0] > "1" && "_" != charArray[0] && 1 == e.currentTarget.selectionStart) {
                                var firstInput = charArray[0];
                                charArray[0] = "0", charArray[1] = firstInput, resetFocus(e, charArray);
                            }
                            if (10 == mask.length && charArray[3] > "3" && "_" != charArray[3] && 4 == e.currentTarget.selectionStart) {
                                var third = charArray[3];
                                charArray[3] = "0", charArray[4] = third, resetFocus(e, charArray);
                            }
                            if (7 == mask.length || 10 == mask.length) {
                                var yearRange, thirdYrDigit, fourthYrDigit, firstTwoYrDigit = (yearRange = 1 == settings.dobYearPrefix ? (new Date).getFullYear() - 14 : (new Date).getFullYear() - 50).toString().substring(0, 2);
                                if ("0" == charArray[yrcharpos1] && "_" != charArray[yrcharpos1] && "_" != charArray[yrcharpos2] && "_" == charArray[yrcharpos3]) firstTwoYrDigit + (thirdYrDigit = "0") + (fourthYrDigit = charArray[yrcharpos2]) > yearRange ? (charArray[yrcharpos1] = "1", 
                                charArray[yrcharpos2] = "9") : firstTwoYrDigit + thirdYrDigit + fourthYrDigit <= yearRange && (charArray[yrcharpos1] = "2", 
                                charArray[yrcharpos2] = "0"), charArray[yrcharpos3] = thirdYrDigit, charArray[yrcharpos4] = fourthYrDigit, 
                                resetFocus(e, charArray);
                                if (charArray[yrcharpos1] > "0" && "_" != charArray[yrcharpos2] && "_" != charArray[yrcharpos1] && e.currentTarget.selectionStart == yrcharpos3) firstTwoYrDigit + (thirdYrDigit = charArray[yrcharpos1]) + (fourthYrDigit = charArray[yrcharpos2]) >= yearRange && thirdYrDigit + fourthYrDigit != "19" && thirdYrDigit + fourthYrDigit != "20" ? (charArray[yrcharpos1] = "1", 
                                charArray[yrcharpos2] = "9", charArray[yrcharpos3] = thirdYrDigit, charArray[yrcharpos4] = fourthYrDigit) : firstTwoYrDigit + thirdYrDigit + fourthYrDigit <= yearRange && thirdYrDigit + fourthYrDigit != "19" && thirdYrDigit + fourthYrDigit != "20" && (charArray[yrcharpos1] = "2", 
                                charArray[yrcharpos2] = "0", charArray[yrcharpos3] = thirdYrDigit, charArray[yrcharpos4] = fourthYrDigit), 
                                thirdYrDigit + fourthYrDigit != "19" && thirdYrDigit + fourthYrDigit != "20" && resetFocus(e, charArray);
                                -1 != e.currentTarget.value.indexOf("_") && e.currentTarget.setSelectionRange(e.currentTarget.value.indexOf("_"), e.currentTarget.value.indexOf("_"));
                            }
                        }), 100);
                    }
                }
                input.data($.mask.dataName, (function() {
                    return $.map(buffer, (function(c, i) {
                        return tests[i] && c != getPlaceholder(i) ? c : null;
                    })).join("");
                })), input.one("unmask", (function() {
                    input.off(".mask").removeData($.mask.dataName);
                })).on("focus.mask", (function() {
                    var pos;
                    input.prop("readonly") || (clearTimeout(caretTimeoutId), focusText = input.val(), 
                    pos = checkVal(), caretTimeoutId = setTimeout((function() {
                        input.get(0) === document.activeElement && (writeBuffer(), pos == mask.replace("?", "").length ? input.caret(0, pos) : input.caret(pos));
                    }), 10));
                })).on("blur.mask", blurEvent).on("keydown.mask", (function keydownEvent(e) {
                    if (!input.prop("readonly")) {
                        var pos, begin, end, k = e.which || e.keyCode;
                        oldVal = input.val(), 8 === k || 46 === k || iPhone && 127 === k ? (begin = (pos = input.caret()).begin, 
                        (end = pos.end) - begin == 0 && (begin = 46 !== k ? function seekPrev(pos) {
                            for (;--pos >= 0 && !tests[pos]; ) ;
                            return pos;
                        }(begin) : end = seekNext(begin - 1), end = 46 === k ? seekNext(end) : end), clearBuffer(begin, end), 
                        shiftL(begin, end - 1), e.preventDefault()) : 13 === k ? blurEvent.call(this, e) : 27 === k && (input.val(focusText), 
                        input.caret(0, checkVal()), e.preventDefault());
                    }
                })).on("keypress.mask", (function keypressEvent(e) {
                    if (!input.prop("readonly")) {
                        var p, c, next, k = e.which || e.keyCode, pos = input.caret();
                        if (!(e.ctrlKey || e.altKey || e.metaKey || k < 32) && k && 13 !== k) {
                            if (pos.end - pos.begin != 0 && (clearBuffer(pos.begin, pos.end), shiftL(pos.begin, pos.end - 1)), 
                            (p = seekNext(pos.begin - 1)) < len && (c = String.fromCharCode(k), tests[p].test(c))) {
                                if (function shiftR(pos) {
                                    var i, c, j, t;
                                    for (i = pos, c = getPlaceholder(pos); i < len; i++) if (tests[i]) {
                                        if (j = seekNext(i), t = buffer[i], buffer[i] = c, !(j < len && tests[j].test(t))) break;
                                        c = t;
                                    }
                                }(p), buffer[p] = c, writeBuffer(), next = seekNext(p), android) {
                                    setTimeout((function() {
                                        $.proxy($.fn.caret, input, next)();
                                    }), 0);
                                } else input.caret(next);
                                pos.begin <= lastRequiredNonMaskPos && tryFireCompleted();
                            }
                            e.preventDefault();
                        }
                    }
                })).on("input.mask paste.mask", (function() {
                    input.prop("readonly") || setTimeout((function() {
                        var pos = checkVal(!0);
                        input.caret(pos), tryFireCompleted();
                    }), 0);
                })), chrome && android && input.off("input.mask").on("input.mask", (function androidInputEvent(e) {
                    var curVal = input.val(), pos = input.caret(), proxy = function() {
                        $.proxy($.fn.caret, input, pos.begin, pos.begin)();
                    };
                    if (oldVal && oldVal.length && oldVal.length > curVal.length) {
                        for (var nextPos = checkVal(!0), curPos = pos.end; curPos > 0 && !tests[curPos - 1]; ) curPos--;
                        0 === curPos && (curPos = nextPos), pos.begin = curPos, setTimeout((function() {
                            proxy(), tryFireCompleted();
                        }), 0);
                    } else pos.begin = checkVal(!0), setTimeout((function() {
                        proxy(), tryFireCompleted();
                    }), 0);
                })), checkVal(), -1 != mask.indexOf("/") && 0 != settings.autoPrefix && (input.on("keyup", (function(e) {
                    10 == mask.length && prefixLogic(6, 7, 8, 9, e), 7 == mask.length && prefixLogic(3, 4, 5, 6, e), 
                    5 == mask.length && prefixLogic(0, 0, 0, 0, e);
                })), input.on("click", (function(e) {
                    -1 != e.currentTarget.value.indexOf("_") && e.currentTarget.setSelectionRange(e.currentTarget.value.indexOf("_"), e.currentTarget.value.indexOf("_"));
                })), input.on("select", (function(e) {
                    "" != e.currentTarget.value && -1 == e.currentTarget.value.indexOf("_") && 0 == e.currentTarget.selectionStart && e.currentTarget.selectionEnd == mask.length && e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
                })));
            }));
        },
        maskSSN: function(mask, settings) {
            var caretTimeoutId, input, defs, tests, partialPosition, firstNonMaskPos, lastRequiredNonMaskPos, len, oldVal, ua = navigator.userAgent, iPhone = /iphone/i.test(ua), chrome = /chrome/i.test(ua), android = /android/i.test(ua);
            if (this.length > 0 && (input = $(this[0]), !mask)) {
                var fn = input.data($.mask.dataName);
                return fn ? fn() : void 0;
            }
            return settings = $.extend({
                autoclear: !1,
                placeholder: $.mask.placeholder,
                completed: null,
                maskedCharsLength: 5,
                maskedChar: "X",
                numericMaskedCharEquivalent: "9"
            }, settings), defs = $.mask.definitions, tests = [], partialPosition = len = mask.length, 
            firstNonMaskPos = null, $.each(mask.split(""), (function(i, c) {
                "?" == c ? (len--, partialPosition = i) : defs[c] ? (tests.push(new RegExp(defs[c])), 
                null === firstNonMaskPos && (firstNonMaskPos = tests.length - 1), partialPosition > i && (lastRequiredNonMaskPos = tests.length - 1)) : (settings.maskedCharsLength++, 
                tests.push(null));
            })), this.trigger("unmask").each((function() {
                function tryFireCompleted() {
                    if (settings.completed) {
                        for (var i = firstNonMaskPos; lastRequiredNonMaskPos >= i; i++) if (tests[i] && buffer[i] === getPlaceholder(i)) return;
                        settings.completed.call(input);
                    }
                }
                function getPlaceholder(i) {
                    return settings.placeholder.charAt(i < settings.placeholder.length ? i : 0);
                }
                function seekNext(pos) {
                    for (;++pos < len && !tests[pos]; ) ;
                    return pos;
                }
                function shiftL(begin, end) {
                    var i, j;
                    if (!(0 > begin)) {
                        for (i = begin, j = seekNext(end); len > i; i++) if (tests[i]) {
                            if (!(len > j && tests[i].test(buffer[j]))) break;
                            buffer[i] = buffer[j], buffer[j] = getPlaceholder(j), j = seekNext(j);
                        }
                        writeBuffer(), input.caret(Math.max(firstNonMaskPos, begin));
                    }
                }
                function blurEvent() {
                    checkVal(), input.val() != focusText && input.change();
                }
                function clearBuffer(start, end) {
                    var i;
                    for (i = start; end > i && len > i; i++) tests[i] && (buffer[i] = getPlaceholder(i));
                }
                function writeBuffer() {
                    var i, val = [];
                    for (i = 0; i < buffer.length; i++) i < settings.maskedCharsLength ? val.push(buffer[i].replace(/\d/i, settings.maskedChar)) : val.push(buffer[i]);
                    input.val(val.join("")), input.siblings("input.secureInput").val(buffer.join(""));
                }
                function checkVal(allow, val) {
                    var i, c, pos, test = val && replaceStartChars(val, settings.maskedChar, settings.numericMaskedCharEquivalent, settings.maskedCharsLength - 2) || input.data($.mask.dataName)(), lastMatch = -1;
                    for (i = 0, pos = 0; len > i; i++) if (tests[i]) {
                        for (buffer[i] = getPlaceholder(i); pos++ < test.length; ) if (c = test.charAt(pos - 1), 
                        tests[i].test(c)) {
                            buffer[i] = c, lastMatch = i;
                            break;
                        }
                        if (pos > test.length) {
                            clearBuffer(i + 1, len);
                            break;
                        }
                    } else buffer[i] === test.charAt(pos) && pos++, partialPosition > i && (lastMatch = i);
                    return allow ? writeBuffer() : partialPosition > lastMatch + 1 ? settings.autoclear || buffer.join("") === defaultBuffer ? (input.val() && input.val(""), 
                    clearBuffer(0, len)) : writeBuffer() : input.val(input.val().substring(0, lastMatch + 1)), 
                    partialPosition ? i : firstNonMaskPos;
                }
                function replaceStartChars(str, oldC, newC, matchCount) {
                    return str.replace(new RegExp("^" + oldC + "{" + matchCount + "}", "g"), function(newC, matchCount) {
                        for (var c = [], i = 0; i < matchCount; i++) c.push(newC);
                        return c.join("");
                    }(newC, matchCount));
                }
                var input = $(this), isEditable = !(input.prop("readonly") || input.prop("disabled")), buffer = $.map(mask.split(""), (function(c, i) {
                    return "?" != c ? defs[c] ? getPlaceholder(i) : c : void 0;
                })), defaultBuffer = buffer.join(""), focusText = input.val();
                input.data($.mask.dataName, (function() {
                    return $.map(buffer, (function(c, i) {
                        return tests[i] && c != getPlaceholder(i) ? c : null;
                    })).join("");
                })), input.one("unmask", (function() {
                    if (input.off(".mask"), isEditable) {
                        var showValue = input.data($.mask.dataName)() ? input.data($.mask.dataName)() : input.val();
                        input.val(replaceStartChars(showValue, settings.numericMaskedCharEquivalent, settings.maskedChar, settings.maskedCharsLength - 2)), 
                        input.data("dirtyState", !1);
                    }
                    input.removeData($.mask.dataName);
                })).on("focus.mask", (function() {
                    var pos;
                    isEditable && (clearTimeout(caretTimeoutId), focusText = $(input).data($.mask.dataName)(), 
                    pos = checkVal(), caretTimeoutId = setTimeout((function() {
                        pos == mask.replace("?", "").length ? input.caret(0, pos) : input.caret(pos);
                    }), 10));
                })).on("blur.mask", blurEvent).on("keydown.mask", (function keydownEvent(e) {
                    if (!input.prop("readonly")) {
                        var pos, begin, end, k = e.which || e.keyCode;
                        oldVal = input.val(), 8 === k || 46 === k || iPhone && 127 === k ? (begin = (pos = input.caret()).begin, 
                        (end = pos.end) - begin == 0 && (begin = 46 !== k ? function seekPrev(pos) {
                            for (;--pos >= 0 && !tests[pos]; ) ;
                            return pos;
                        }(begin) : end = seekNext(begin - 1), end = 46 === k ? seekNext(end) : end), clearBuffer(begin, end), 
                        shiftL(begin, end - 1), e.preventDefault()) : 13 === k ? blurEvent.call(this, e) : 27 === k && (input.val(focusText), 
                        input.caret(0, checkVal()), e.preventDefault());
                    }
                })).on("keypress.mask", (function keypressEvent(e) {
                    if (!input.prop("readonly")) {
                        var p, c, next, k = e.which || e.keyCode, pos = input.caret();
                        if (!(e.ctrlKey || e.altKey || e.metaKey || k < 32) && k && 13 !== k) {
                            if (pos.end - pos.begin != 0 && (clearBuffer(pos.begin, pos.end), shiftL(pos.begin, pos.end - 1)), 
                            (p = seekNext(pos.begin - 1)) < len && (c = String.fromCharCode(k), tests[p].test(c))) {
                                if (function shiftR(pos) {
                                    var i, c, j, t;
                                    for (i = pos, c = getPlaceholder(pos); len > i; i++) if (tests[i]) {
                                        if (j = seekNext(i), t = buffer[i], buffer[i] = c, !(len > j && tests[j].test(t))) break;
                                        c = t;
                                    }
                                }(p), buffer[p] = c, writeBuffer(), next = seekNext(p), android) {
                                    setTimeout((function() {
                                        $.proxy($.fn.caret, input, next)();
                                    }), 0);
                                } else input.caret(next);
                                pos.begin <= lastRequiredNonMaskPos && tryFireCompleted();
                            }
                            e.preventDefault();
                        }
                    }
                })).on("input.mask paste.mask", (function() {
                    !isEditable || setTimeout((function() {
                        var pos = checkVal(!0);
                        input.caret(pos), tryFireCompleted();
                    }), 0);
                })).on("focus.mask", (function() {
                    var pos;
                    input.prop("readonly") || (clearTimeout(caretTimeoutId), focusText = input.val(), 
                    pos = checkVal(), caretTimeoutId = setTimeout((function() {
                        input.get(0) === document.activeElement && (writeBuffer(), pos == mask.replace("?", "").length ? input.caret(0, pos) : input.caret(pos));
                    }), 10));
                })), chrome && android && input.off("input.mask").on("input.mask", (function androidInputEvent(e) {
                    var curVal = input.val();
                    if (oldVal && oldVal.length && curVal.length < oldVal.length) input.val(""), clearBuffer(0, buffer.length); else {
                        var code = oldVal ? function getChangedChar(oldV, newV) {
                            var c = newV.split("").find((function(v, i) {
                                return v !== oldV[i];
                            }));
                            return c && c !== $.mask.placeholder && c !== settings.maskedChar ? c : "";
                        }(oldVal, curVal) : curVal, pos = checkVal(!0, input.data($.mask.dataName)() + code);
                        window.setTimeout((function() {
                            input.caret(pos, pos);
                        }), 10), e.stopImmediatePropagation();
                    }
                    return tryFireCompleted(), !1;
                })), checkVal(!0, input.val()), checkVal();
            }));
        }
    });
}));