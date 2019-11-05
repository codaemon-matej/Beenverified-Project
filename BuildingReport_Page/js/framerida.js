/*
 * framerida.js - 0.1.0
 *
 * Terminology used throughout the comments/docs:
 * Data source - An entity whose data is saved in localStorage.
 *    e.g:
 *         - A form element whose values are to be saved is a data source.
 *         - The query string is a data source.
 * Bound element - An element whose data comes from a data source.
 *    e.g:
 *        - An <h1> that binds to the "search" data found in localStorage.
 *        - A form whose input values are filled from data in localStorage.
 */

/* global  _, jQuery, amplify, Handlebars */

(function(root, $, _, amplify, H) {
  "use strict";

  var fr = {},
      store = amplify.store,
      storage;

  /* Keeps a mapping of dataSources to bound elements */
  var dataSourceDeps = {};
  fr.dataSourceDeps = dataSourceDeps;

  var templates = {}; // {elemId: {tpl: function() {}, dataSource: 'name'}}
  fr.templates = templates;

  var ignoredValues = {}; // {elemId: {name1: val1, name2: val2}}
  fr.ignoredValues = ignoredValues;

  /*
   * @private
   */
  var interceptJQueryOnEvents = function () {
    var origOn = $.fn.on;
    $.fn.on = function() {
      var $selectedElems = $(this);

      if (arguments.length <= 2 && this.selector) {
        if ($selectedElems.data('fr-click') || $selectedElems.data('fr-store')) {
          return origOn.call($("body"), arguments[0], this.selector, arguments[1]);
        }
      }

      if (arguments.length > 2) { // it's a delegated handler
        var hasFRClick = $selectedElems.find("[data-fr-click]").length > 0,
            hasFRSubmit = $selectedElems.find("[data-fr-store]").length > 0;
        if (hasFRClick) {
          return origOn.apply($("body"), arguments[0], arguments);
        }
      }
      return origOn.apply(this, arguments);
    };
  };

  /* Used internally to escape variables with brackets in it. */
  Handlebars.registerHelper("escape", function(value) {
    return this[value];
  });

  /*
   * Patches support for the storageChange event into amplify.store.
   * Can be used through jQuery like this: $(document).on('storageChange', fn);
   */
  var patchAmplifyEventSupport = function() {
    var origStore = store;

    $.event.trigger({
      type: 'storageChange'
    });

    amplify.store = function() {
      var result,
          key = arguments[0],
          val = arguments[1],
          argsLen = arguments.length,
          storageData = {
              dataSource: key,
              data: val
          };

      if (argsLen === 1) {
        result = origStore(key);
      } else if (argsLen === 2) {
        result = origStore(key, val);
        $(document).trigger('storageChange', storageData);
      } else {
        result = origStore.apply(this, arguments);
      }
      return result;
    };

    store = amplify.store;
  };

  /*
   * @private
   * Escapes square brackets from handlebars variables by replacing the invalid
   * syntax with a call to the escape helper.
   */
  fr._escapeHandlebarsSquareBrackets = function(html) {
    var escaped = html.replace(/{{(\w+?)\[(\w.+?)\]}}/gi, "{{escape '$1[$2]'}}");
    return escaped;
  };

  /*
   * @private
   * In IE8/9, parsed HTML looks like this:
   * <INPUT TYPE=TEXT VALUE={{my_value}} ID=myInput>
   * which breaks handlebars because surrounding quotes are missing for
   * attribute values. The following fixes this issue by making sure that
   * surrounding quotes are added to the attribute values before templating.
   */
  fr._fixMustachesForIE8 = function(html) {
    var fixed = html.replace(/=({{\w.+?}})/gi, '="$1"');
    return fixed;
  };

  fr._applyHtmlFixes = function(html) {
    html = fr._fixMustachesForIE8(html);
    html = fr._escapeHandlebarsSquareBrackets(html);
    return html;
  };

  /*
   * @private
   * Helper for compiling templates into resolved html.
   */
  fr._template = function(html, data, templateId) {
    html = fr._applyHtmlFixes(html);
    if (!templates[templateId]) {
        templates[templateId] = H.compile(html);
    }
    return templates[templateId](data);
  };

  /*
   * @private
   * Parses query arguments and returns them as an object.
   */
  fr._parseQueryArgs = function(query) {
    if (!query) {
      return null;
    }
    var args = _
        .chain(query.split('&'))
        .map(function(params) {
            var p = params.split('=');
            var key = p[0];
            var val = window.decodeURIComponent(p[1]);
            val = val.replace(/\/+$/g, ""); // clean up trailing slash
            val = val.replace(/\+/g, " "); // replace white spaces
            return [key, val];
        })
        .object()
        .value();
    return args;
  };

  /*
   * @private
   * Makes sure to clear out any dataSources that depend on the query
   * string args when no query args are present. Returns the dataSource that
   * binds to the query arguments if found.
   */
  fr._checkQueryStringDeps = function(queryArgs) {
    var $meta = $("meta[data-fr-query]"),
        dataSource = $meta.data('fr-query');
    if ($meta.length === 0) return false;
    if (!queryArgs) {
      store(dataSource, "");
    }
    return dataSource;
  };

  /*
   * @private
   * Checks the given element for a <select> element.
   * If the <select> has a value attribute, choose the
   * corresponding option.
   */
  fr._choosePossibleSelectOption = function($boundElem) {
    var $selects = $boundElem.find("select");
    $.each($selects, function(idx, select) {
      var selectVal = select.getAttribute('value');
      if (selectVal) {
        $(select).val(selectVal);
      }
    });
  };

  fr._tickCheckBoxes = function ($boundElem) {
    var $cbs = $boundElem.find("input[type=checkbox]");
    $.each($cbs, function (idx, cb) {
      var checkedVal = $(cb).attr('data-fr-checked');
      if (checkedVal && checkedVal != "0") {
        $(cb).prop('checked', checkedVal);
      }
    });
  };

  /*
   * @private
   * Takes the correct course of action to store query string args
   * to localStorage after checking for specific saving conventions.
   */
  fr._storeQueryArgs = function(queryString) {
    var args = fr._parseQueryArgs(queryString),
        dataSource = fr._checkQueryStringDeps(args);

    if (args && args.frstore) {
      store(args.frstore, args);
    } else if (args && dataSource) {
      store(dataSource, args);
    } else {
      store("query", args);
    }
    storage = store();
  };

  /*
   * @private
   * Returns all elements capable of storing data to a dataSource.
   */
  fr._collectDataSourceElems = function() {
    return $("[data-fr-store]");
  };

  /*
   * @private
   * Returns all elements that bind to a dataSource.
   */
  fr._collectBoundedElems = function() {
    return $("[data-fr-bind]");
  };

  /*
   * @private
   * Combine the dataSources into a single data object.
   * Namespace duplicate properties with the name of the dataSource they
   * belong to.
   * E.g: searchData_fn: 'John'.
   */
  fr._mergeDataSources = function(dataSources, storage) {
    var data = {};
    _.forEach(dataSources, function(ds) {
      _.forEach(storage[ds], function(val, prop) {
        if (data[prop]) { // found a duplicate, namespace it.
          data[ds + '_' + prop] = val;
        } else {
          data[prop] = val;
        }
      });
    });
    data._framerida_original_datasources = dataSources;
    return data;
  };

  /*
   * @private
   * Apply and return the result of the provided sorting function.
   */
  fr._applySorting = function(data, fn) {
    var sortFn = root[fn];
    if (sortFn) {
      data = sortFn(data);
    }
    return data;
  };

  /*
   * @private
   * Apply and return an instance of the provided function constructor.
   */
  fr._applyMapping = function(data, fn) {
    return _.map(data, function(item, idx) {
      var instance = new root[fn](item);
      instance._framerida_index = idx;
      return instance;
    });
  };

  /*
   * @private
   * Generate elements from the provided stub element.
   */
  fr._processFrEachElems = function($eachStubElems, data, dataSource) {
    var collectionName, repeatedHtml,
        dataSources = dataSource.split(' '),
        multipleDataSources = dataSources.length > 0;

    $eachStubElems.each(function(idx, eachStubElem) {
      var $eachStubElem = $(eachStubElem),
          $eachStubParent = $eachStubElem.parent(),
          stubId = _.uniqueId(),
          mappingFunction = $eachStubElem.data("fr-map"),
          sortingFunction = $eachStubElem.data("fr-sort"),
          repeatedTpl, ds, dataPath;

      collectionName = $eachStubElem.data('fr-each');
      $eachStubElem.removeAttr('data-fr-each');

      // Check if this stub element needs its data to be mapped
      if (mappingFunction) {
        data[collectionName] = fr._applyMapping(data[collectionName], mappingFunction);
        $eachStubParent.attr('data-fr-mapped', mappingFunction);
      }

      if (sortingFunction) {
        data[collectionName] = fr._applySorting(data[collectionName], sortingFunction);
        $eachStubParent.attr('data-fr-sorted', sortingFunction);
      }

      if (multipleDataSources) {
        // Find the dataSource that this collection belongs to.
        for (ds in dataSources) {
          var dataSourceName = dataSources[ds] || "",
            storageData = storage[dataSourceName] || {};
          if (storageData[collectionName]) {
            dataSource = dataSources[ds];
            break;
          }
        }
      }

      $eachStubParent.attr('data-fr-template', stubId);
      $eachStubParent.attr('data-fr-bound', dataSource);
      $eachStubParent.attr('data-fr-iterated', collectionName);

      dataPath = dataSource + '.' + collectionName + '[{{_framerida_index}}]';
      $eachStubElem.attr('data-fr-bound-iterated', dataPath);

      repeatedHtml = "{{#each " + collectionName + "}}";
      repeatedHtml += $eachStubElem[0].outerHTML;
      repeatedHtml += "{{/each}}";

      repeatedHtml = fr._applyHtmlFixes(repeatedHtml);
      repeatedTpl = H.compile(repeatedHtml);
      templates[stubId] = repeatedTpl;
      repeatedHtml = repeatedTpl(data);

      $eachStubElem.replaceWith(repeatedHtml);
    });
  };

  /*
   * @private
   * Expects the provided data to come from a previously stored data set.
   * Transforms the data by applying the mapping function that is defined
   * within it. e.g: Data that is stored and marked with a mapping function
   * contains a property named ._framerida_mapped. This property gets attached
   * when an item is stored via data-fr-click and is therefore stored into its
   * own localStorage entry, losing its association with fr-click.
   */
  fr._transformWithMappingFn = function(data) {
      // Store references to the original data before applying the mapping.
      var originalDataSources = data._framerida_original_datasources,
          originalFrameridaClick = data._framerida_click;

      if (originalFrameridaClick) {
        originalFrameridaClick = originalFrameridaClick.split(' ')[1];
      }

      // Apply the mapping function
      data = new root[data._framerida_mapped](data);

      // If we have multiple dataSources, applying the mapping function gets
      // rid of data that it doesnt use. Here we add that data back.
      if (originalFrameridaClick && originalDataSources) {
        _.forEach(originalDataSources, function(originalDs) {
          if (originalDs === originalFrameridaClick) return;
          var dsData = store()[originalDs];
          _.forEach(dsData, function(val, prop) {
            var propName = prop;
            if (data[prop]) {
              propName = originalDs + "_" + prop; // namespace dups
            }
            data[propName] = val;
          });
        });
      }
    return data;
  };

  /*
   * @private
   * Inserts data into elements that bind to a dataSource.
   */
  fr._insertData = function($boundElems, dataSource, storage) {
    var data = {},
        dataSources = dataSource.split(' '),
        multipleDataSources = dataSources.length > 1;

    if (multipleDataSources) {
      data = fr._mergeDataSources(dataSources, storage);
    } else {
      data = storage[dataSource] || {};
    }

    $boundElems.each(function(idx, boundElem) {
      var $boundElem = $(boundElem),
          $boundElemClone = $boundElem.clone(),
          $eachStubElems = $boundElemClone.find("[data-fr-each]"),
          uid = _.uniqueId(),
          html;

      fr._processFrEachElems($eachStubElems, data, dataSource);

      if (data._framerida_mapped) {
        data = fr._transformWithMappingFn(data);
      }

      if (!$boundElem.attr('data-fr-id')) {
        $boundElem.attr('data-fr-id', uid);
        html = fr._template($boundElemClone.html(), data, uid);
      } else {
        html = templates[$boundElem.attr('data-fr-id')](data);
      }

      var boundElemId = $boundElem.data('fr-id');

      $boundElem.html(html);
      if ($boundElem.attr('data-fr-store')) {

        var $ignoredElems = $boundElem.find('[data-fr-ignore]');

        // Populate those fields with in-memory values.
        if (typeof boundElemId !== "undefined" && ignoredValues[boundElemId]) {
          $ignoredElems.each(function (idx, ignoredElem) {
            var $ignoredElem = $(ignoredElem),
                ignoredName = $ignoredElem.attr('name'),
                inMemoryValue = ignoredValues[boundElemId][ignoredName];
            if ($ignoredElem.is(":checkbox")) {
              $ignoredElem.prop('checked', inMemoryValue == 1);
            } else {
              $ignoredElem.val(inMemoryValue);
            }
          });
        }
      }

      fr._choosePossibleSelectOption($boundElem);
      fr._tickCheckBoxes($boundElem);
    });
  };

  /*
   * @private
   * Transforms form data from $.serializeArray into an object that maps
   * input names to input values.
   * e.g: [{name: "fn", value: "John"}, {name: "ln", value: "Smith"}] =>
   *      {fn: "John", ln: "Smith"}
   * @param data {array} - Data structured in the form of $.serializeArray
   */
  fr._transformFormData = function(data) {
    var result = {};
    _.forEach(data, function(obj) {
      result[obj.name] = obj.value;
    });
    return result;
  };

  /*
   * @private
   * Store elements according to the dataSource they depend on.
   */
  fr._storeDataSourceDeps = function($boundElems) {
    $boundElems.each(function(idx, boundElem) {
      var $boundElem = $(boundElem),
          dataSource = $boundElem.data('fr-bind');
      if (!dataSourceDeps[dataSource]) {
        dataSourceDeps[dataSource] = [];
      }
      dataSourceDeps[dataSource].push($boundElem);
    });
  };

  /*
   * @private
   * Checks if the form argument's input fields has class names that
   * contain 'error' or 'invalid' as substrings. The assumption here
   * is that any validation plugin will mark inputs with the above
   * mentioned classes when validation fails.
   */
  fr._hasInvalidClassNames = function (form) {
     var hasInvalid = false,
        $form = $(form),
        $inputs = $form.find('input');
     $inputs.each(function (idx, input) {
       if (hasInvalid) return;
       var classNames = ($(input).attr('class') || "").toLowerCase(),
           hasInvalidName = classNames.indexOf("invalid")!== -1,
           hasErrorName = classNames.indexOf("error") !== -1;
       if (hasInvalidName || hasErrorName) {
         hasInvalid = true;
       }
     });
     return hasInvalid;
  };

  /*
   * @private
   * Registers event handlers on data sources (only forms for now) and stores
   * their data to localStorage.
   */
  fr._bindDataSourceHandlers = function() {
    $('body').on('submit', "[data-fr-store]", function(evt) {
      if (fr._hasInvalidClassNames(this)) {
        return;
      }
      var formVals = $(this).serializeArray(),
          storageKey = $(this).data('fr-store'),
          formId = $(this).data('fr-id'),
          ignoredElems = $(this).find('[data-fr-ignore]');

      formVals = fr._transformFormData(formVals);

      var cbs = $(this).find('[type=checkbox]');

      if (cbs.length > 0) {
      // Make sure that unticked checkboxes are also included in form data
      // jQuery ignores unticked cbs and doesnt list them in serialized results.
        _.each(cbs, function (cb) {
          var $cb = $(cb), cbName = $cb.attr('name');
          if (!formVals[cbName]) {
            formVals[cbName] = "0"; // 0 for unchecked.
          }
        });
      }

      ignoredElems = _.map(ignoredElems, function (ignored) {
        return $(ignored).attr('name');
      });

      _.each(ignoredElems, function (ignoredName) {
        if (formVals[ignoredName]) {
          if (!ignoredValues[formId]) {
            ignoredValues[formId] = {};
          }
          ignoredValues[formId][ignoredName] = formVals[ignoredName];
          delete formVals[ignoredName];
        }
      });

      store(storageKey, formVals);
    });
  };

  /*
   * @private
   * Renders elements when fr-each is used.
   */
  fr._renderEachStubs = function(dataSource) {
    _.forEach(dataSourceDeps[dataSource], function(boundElem) {
      var $iteratedElems = $(boundElem).find('[data-fr-iterated]'),
          mappingFunction = $iteratedElems.data('fr-mapped'),
          sortingFunction = $iteratedElems.data('fr-sorted'),
          collectionName = $iteratedElems.data('fr-iterated');

      if ($iteratedElems.length > 0) {
        var boundTo = $iteratedElems.data('fr-bound');

        $iteratedElems.each(function(idx, iteratedElem) {
          var $iteratedElem = $(iteratedElem),
              elemId = $iteratedElem.data('fr-template'),
              data = fr._mergeDataSources(boundTo.split(' '), store()),
              newHtml;

          if (mappingFunction) {
            data[collectionName] = fr._applyMapping(data[collectionName], mappingFunction);
          }

          if (sortingFunction) {
            data[collectionName] = fr._applySorting(data[collectionName], sortingFunction);
          }

          newHtml = templates[elemId](data);
          $iteratedElem.html(newHtml);
        });
      }
    });
  };

  /*
   * @public
   * Returns localStorage data from a dataPath string.
   * e.g: teaserData.teasers[2] => {...}
   */
  fr.dataFromDataPath = function(dataPathString) {

    var dataPathRgx = /(\w.*)\.(\w+)\[(\d+)\]/g,
        rgxResults = dataPathRgx.exec(dataPathString),
        storage = store(),
        boundData;

    if (!rgxResults || rgxResults.length < 4) {
      throw new Error("Invalid dataPath structure: " + dataPathString);
    }

    var boundDataSource = rgxResults[1],
        collectionName = rgxResults[2],
        collectionIdx = rgxResults[3];

    var boundDataSources = boundDataSource.split(' ');

    if (boundDataSources.length > 1) {
      // Find which of the boundDataSources has the data.
      for (var i = 0; i < boundDataSources.length; i++) {
        var boundDs = boundDataSources[i];
        if (storage[boundDs] && storage[boundDs][collectionName]) {
          boundDataSource = boundDs;
          break;
        }
      }

      if (boundDataSource.split(' ').length > 1) {
        return {};
      }
    }

    boundData = storage[boundDataSource][collectionName][collectionIdx];
    return boundData;
  };

  /*
   * @private
   * Attaches click handlers for elements marked with data-fr-click.
   * e.g: <div data-fr-click="store currentRecord"></div>
   * Note: Elements with data-fr-click are marked with data-fr-bound
   * which contains a dataPath to the data bound to the element.
   * e.g: Above example becomes something like this:
   * <div data-fr-click="..." data-fr-bound="dataSet.collection[0]"></div>
   */
  fr._attachClickHandlers = function() {
    $("body").on("click", "[data-fr-click]", function(evt) {
      var dataPath = $(this).data("fr-bound-iterated"),
          actionStr = $(this).data("fr-click"),
          mapped = $(this).data("fr-map"),
          actionSplit, action, targetStorage, boundData;

      if (actionStr) {
        actionSplit = actionStr.split(' ');
        action = actionSplit[0];
        targetStorage = actionSplit[1];
        if (!action || !targetStorage) {
          throw new Error("Invalid action: " + actionStr);
        }
      }

      if (action === 'store') {
        boundData = fr.dataFromDataPath(dataPath);
        if (mapped) {
          boundData._framerida_mapped = mapped;
          boundData._framerida_boundTo = dataPath;
          boundData._framerida_click = actionStr;
        }
        store(targetStorage, boundData);
      }
    });
  };

  /*
   * Gets the wheels rolling.
   */
  fr.initialize = function() {
    patchAmplifyEventSupport();
    storage = store();

    var queryString = window.location.search.substring(1); // ? char

    fr._storeQueryArgs(queryString);

    var $boundElems = fr._collectBoundedElems();

    fr._bindDataSourceHandlers();
    fr._storeDataSourceDeps($boundElems);

    _.forEach(dataSourceDeps, function(boundElems, dataSource) {
      fr._insertData($(boundElems), dataSource, storage);
    });

    $(document).on('storageChange', function(evt, data) {
      var dataSource = data.dataSource,
          boundElemsColl = {};

      // Find element sets that depend on this dataSource.
      // This includes elements that bind to multiple dataSources.
      _.forEach(dataSourceDeps, function(val, ds) {
        if (_.contains(ds.split(' '), dataSource)) {
            boundElemsColl[ds] = dataSourceDeps[ds];
        }
      });

      _.forEach(boundElemsColl, function(boundElems, ds) {
        fr._insertData($(boundElems), ds, store());
        fr._renderEachStubs(ds);
      });
    });

    fr._attachClickHandlers();
    interceptJQueryOnEvents();
    $("body").removeClass("hide").removeClass('fr-hide');
  };

  if (!root._framerida_test_mode) {
    try {
     fr.initialize();
    } catch (error) {
      // Make sure the page gets displayed despite any errors.
      $("body").removeClass("hide").removeClass('fr-hide');
      throw error;
    }
  }

  root.framerida = fr;
}(window, jQuery, _, amplify, Handlebars));