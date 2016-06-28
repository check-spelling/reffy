var jsdom = require('jsdom');


function extract(url, cb) {
    jsdom.env(url, [],
              function(err, window) {
                  if (err) return cb(err);
                  var generator = window.document.querySelector("meta[name='generator']");
                  if (generator && generator.content.match(/bikeshed/i)) {
                      extractSimpleReferences(window.document, {
                          generator: "Bikeshed",
                          sectionId: {
                              normative: "normative",
                              informative: "informative"
                          },
                          listSelector: {
                              normative: "#normative + dl",
                              informative: "#informative + dl"
                          }
                      }, cb);
                  } else if (window.document.body.id === "respecDocument") {
                      extractSimpleReferences(window.document, {
                          generator: "ReSpec",
                          sectionId: {
                              normative: "normative-references",
                              informative: "informative-references"
                          },
                          listSelector: {
                              normative: "#normative-references > dl",
                              informative: "#informative-references > dl"
                          }
                      }, cb);
                  } else {
                      cb(new Error("Unrecognized generator of spec for " + url));
                  }
              }
             );
}

function extractSimpleReferences(doc, rules, cb) {
    var extractReferencesFromList = function(referenceList) {
        return [].map.call(referenceList.querySelectorAll("dt"), function(dt) {
            var ref = {};
            ref.name = dt.textContent.replace(/[\[\] \n]/g, '');
            var desc = dt.nextSibling;
            ref.url = desc.querySelector("a[href]").href;
            return ref;
        });
    };

    if (!rules) {
        return cb(new Error("No extraction rules specified"));
    }
    if (!rules.sectionId ||
        !rules.sectionId.normative ||
        !rules.sectionId.informative) {
        return cb(new Error("Extraction rules for references section are incorrect"));
    }
    if (!rules.listSelector ||
        !rules.listSelector.normative ||
        !rules.listSelector.informative) {
        return cb(new Error("Extraction rules for the list of references are incorrect"));
    }
    var generator = rules.generator || "an unknown generator";

    var error = null;
    var references = {};
    ['normative', 'informative'].forEach(function(referenceType) {
        if (error) return;
        var refHeading = doc.getElementById(rules.sectionId[referenceType]);
        if (!refHeading) {
            error = new Error("Spec " + url + " is generated with " + generator + " but does not have a '" + rules.sectionId[referenceType]  + "' id");
            return;
        }
        var referenceList = doc.querySelector(rules.listSelector[referenceType]);
        if (!referenceList) {
            error = new Error("Spec " + url + " is generated with " + generator + " but does not have a definition list following the heading with id '" + rules.id[referenceType] + "'");
            return;
        }
        references[referenceType] = extractReferencesFromList(referenceList);
    });

    if (error) {
        return cb(error);
    }
    else {
        cb(null, references);
    }
}

module.exports.extract = extract;

if (require.main === module) {
    var url = process.argv[2];
    if (!url) {
        console.error("Required URL parameter missing");
        process.exit(2);
    }
    extract(url, function(err, references) {
        if (err) {
            console.error(err);
            process.exit(64);
        }
        console.log(JSON.stringify(references, null, 2));
    });
}
