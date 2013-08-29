



/*
* can mixin this type to aid validation
*/ 
function InterfaceType(body) {

	body.implements = function(implementation) {
	
		for(prop in body) {
		
			if(body.hasOwnProperty(prop) && prop !== 'implements') {
			
				if(!implementation.hasOwnProperty(prop) 
					|| typeof implementation[prop] != typeof body[prop]) {
					
					return false;
				}
			}
		}
		
		return true;
	};
	
	return body;
}


// should these be mixins rather than setter wrappers?
/*
var HtmlEntities = {

	_cache : [],

	as : function(domEl, action) {
	
		if(!HtmlEntities._cache[domEl]) { 
			
			HtmlEntities._cache[domEl] = {
			
				set : function(val) {
				
					action(val);
				}
			};		
		}
		
		return HtmlEntities._cache[domEl];
	},
	
	// smoothing over the setting of values
	asSetter : function(domEl) {
		
		return HtmlEntities.as(domEl, 
		
			domEl.value 
			
				? function(val) { domEl.value = val; } 
			
				:  function(val) { domEl.innerHTML = val; 
		});
	},
	
	asPosition : function(domEl) {
	
		return HtmlEntities.as(domEl, function(val) {
			
			domEl.style.left = val + 'px';
		});
	}
};
*/

// mixins for binding elements to model values. we need to know what 
// type of a thing we want to update, so we mix in a setter method
// that does what we want
var SetterMixins = {
	
	_setterBase : function(el, setAction) {
		
		// if there is a setter already..
		if(el.set) {
			
			// keep ref to existing function
			var oldSet = el.set;
			
			// attach a new version, overwriting the old
			el.set = function(val) { 
				
				// fire the existing stuff
				oldSet(val);
				
				// fire the new stuff
				setAction(el, val); 
			}
		// if there isnt already a setter	
		} else {
			
			// fire the action when setter is called
			el.set = function(val) { setAction(el, val); };
		}
		
		// return the reference so this can be used as a mixin
		return el;
	},
	
	value : function(pre) {
	
		return SetterMixins._setterBase(this, function(o, val) {
		
			o.value = val;
		});
	},
			
	html : function(pre) {
	
		return SetterMixins._setterBase(this, function(o, val) {
		
			o.innerHTML = pre ? pre(val) : val;
		});
	},
	
	position : function(pre) {
	
		return SetterMixins._setterBase(this, function(o, val) {
		
			o.style.left = (pre ? pre(val) : val) + 'px';
		});
	},
	
	rotation : function(pre) {
	
		return SetterMixins._setterBase(this, function(o, val) {
		
			o.style.transform = 'rotateZ( ' + (pre ? pre(val) : val) + 'deg )';
		});
	}
	

};


var Helpers = {

	asValidatedInput : function(elementName, validateAction) {
	
		return function() {
		
			var el = document.getElementById(elementName);
			
			el.validate = function() { return validateAction(el.value); }
			
			return el;
		};
	}
};





/* view interface */
var iView = new InterfaceType({

	template : ''
});


var Using = {

	id : function(elementId) {
		
		var returnFunction = function() {
		
			return document.getElementById(elementId);
		};
		
		// adding a function to the return function 
		// means we can chain these together 
		// e.g Using.id('elementId').as(function(el){ mod(e.style); });
		returnFunction.as = function(mixin) {
				
			return function() {
			
				var el = document.getElementById(elementId);
				
				return mixin.call(el) || el;
			};
		};
		
		return returnFunction;
	}
};

var Bind = {

	to : function(modelFieldName) {
	
		var _setupBinding = function (el, model) {
		
			el.onchange = function() {
				
				// any model from our ModelType def will have a set method
				model.set(modelFieldName, el.value);
			};
			
			model.onchange(modelFieldName, function(newval) {
			
				// any element should have a set method by this point from 
				// the usage of mixins (custom or default)
				el.set(newval);
			});
		};
	
		var toFunction = function(model) { 
			
			// default mixin - just assuming the value is the value or just the innerHTML
			this.value ? SetterMixins.value.call(this) : SetterMixins.html.call(this) 
			
			_setupBinding(this, model);
		};
		
		toFunction.as = function (mixin) {

			var asFunction = function(model) { 
				
				// user defined mixin
				mixin.call(this);
				
				_setupBinding(this, model);
			}

			asFunction.preprocess = function(pre) {
			
				return function(model) {
			
					// user defined mixin with preprocessor
					mixin.call(this, pre);
					
					_setupBinding(this, model);
				} 
			};
			
			return asFunction;
		};
		
		return toFunction;
	}
};


/*
var Data = {

	bind : function(elementName) {
		
		return {
		
			to : function(modelFieldName) {
			
				return {
				
					as : function (modifier) {
						
						return function(model) {
							// this function should be called using  
							//   func.call(body, model)  
							// to inject the 'this' var 
							this[elementName].onchange = function() {
								
								model.set(modelFieldName, this.value);
							};
							
							model.onchange(modelFieldName, function(newval) {
							
								modifier(this[elementName]).set(newval);
							});						
						};
					}
				};
			}
		};
	}
};
*/














/*
* oncreate, onrenderstart, onrenderend, onload
*/
var Views = {
	
	// single Views-wide queue - should really be private and one 
	// per instance...
	EventQueue : [],
	
	// cycle round queue emptying and firing events
	FireQueuedEvents : function() {
	
		while(Views.EventQueue.length > 0) {
		
			(Views.EventQueue.shift())();
		}
	},
	
	// base class for views: var myViewType = new ViewType({ });
	ViewType : function(body) {
		
		// not sure if this is helpful or not - just experimenting with an
		// interface/validation pattern
		if(!iView.implements(body)) {
		
			throw "the body of the ViewType does not implement iView";
		}
		
		// initialise the modified resig templater to use the desired tags
		var _templater = new TemplaterFactory({ starttag : "<%", endtag : "%>"});

		// returns a builder for views of this type
		return function(model) {		
			
			// private function which curries up the definitions and binding from the body
			// and puts them into a queue to be run when the page has loaded
			_queueDomBindings = function() {
			
				// when everything is rendered populate the references to the 
				// html dom elements, and do databind
				for(el in body.define) {
					
					if(body.define.hasOwnProperty(el)) {
						
						// pushing all the binding to dom elements into a queue so that they can be
						// run once the page has been rendered
						Views.EventQueue.push((function(el) {
							
							// curry up the functionality which will be run and attach things
							return function() {
							
								// run the curried definition
								body[el] = body.define[el]();
								
								// bind them to change events if they exist on the dataBind object
								if(body.dataBind && body.dataBind.hasOwnProperty(el)) {
								
									/*
									*  Bind.to('label').as(HtmlEntities.asPosition);
									*/
									
									// single binding
									if(typeof body.dataBind[el] === 'function') {
									
										body.dataBind[el].call(body[el], model);
									} 
									
									// collection of binders
									if(typeof body.dataBind[el] === 'object') {
									
										for(var i=0; i<body.dataBind[el].length; i++) {
											
											body.dataBind[el][i].call(body[el], model);
										}
									}
								}
							}
							
						// create closure around el
						})(el));
					}
				}
			};
			
			// if the body has a definition for a particular event, fire it
			_fireIfPresent = function(eventname, data) {
			
				if(body[eventname]) { body[eventname](body, data || model); }
			};
			
			// if the body has a definition for a particular event, queue it
			_queueIfPresent = function(eventname, data) {
				
				// if present
				if(body[eventname]) { 
					
					// queue
					Views.EventQueue.push(function() {
						
						// we are passing the body as context - we could call() 
						// the event with the body as the context argument..
						body[eventname](body, data || model);
					});
				}
			};
			
			// queue bindings ready for post-render
			_queueDomBindings();
			
			// fire straight away
			_fireIfPresent('oncreate');
			
			// public render function. draws the full tree of widgets onto the page
			this.render = function(parent) {
				
				// fire render start
				_fireIfPresent('onrenderstart');
			
				// queue up the onload in preparation
				_queueIfPresent('onload');
				
				// do the templating - take the template from the body and mash
				// it with the model
				var html = _templater.tmpl(body.template, model || {});
				
				// done rendering
				_fireIfPresent('onrenderend');		
				
				// if this is the root of the tree..
				if(parent) {
					
					// attach the html to the dom element
					parent.innerHTML += html;
					
					// fire all the queued events that have been waiting for the 
					// elements to be in the dom
					Views.FireQueuedEvents();
				} 
				
				// return the html so that we can use the method
				// to return the templated html string eg for partial views
				return html;
			};
		
		};
	}
}

// builder for models
function Model(body) {
	
	// list of event subscribers
	var _events = [];
	
	// notify everyone registered that the property has changed
	var _notify = function(property) {	
	
		if(_events[property]) {
		
			for(var i=0; i<_events[property].length; i++) {
			
				_events[property][i](body[property]);			
			}
		}	
	};
	
	/* 
	* the body object is wrapped with getters and setters
	* so that all changes can be hooked into for change events
	*/ 
	this.get = function(property) {
	
		return body[property];
	};
	
	this.set = function(property, value) {
	
		body[property] = value;
		
		_notify(property);
	};
	
	// register on change event
	this.onchange = function(property, handler) {
	
		if(!_events[property]) {
		
			_events[property] = [];
		}
		
		_events[property].push(handler);
	};
}