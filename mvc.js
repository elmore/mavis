



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

var SetterMixins = {
	
	_setterBase : function(el, setAction) {
		
		el.set = function(val) { setAction(el, val); }
		
		return el;
	},
	
	value : function() {
	
		return SetterMixins._setterBase(this, function(o, val) {
		
			o.value = val;
		});
	},
		
	html : function() {
	
		return SetterMixins._setterBase(this, function(o, val) {
		
			o.innerHTML = val;
		});
	},
	
	position : function() {
	
		return SetterMixins._setterBase(this, function(o, val) {
		
			o.style.left = val + 'px';
		});
	},
	
	rotation : function() {
	
		return SetterMixins._setterBase(this, function(o, val) {
		
			o.style.transform = 'rotateZ( ' + deg + 'deg )';
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
	
		var returnFunction = function(model) { 
			
			// default mixin - just assuming the value is the value or just the innerHTML
			this.value ? SetterMixins.value.call(this) : SetterMixins.html.call(this) 
			
			_setupBinding(this, model);
		};
		
		returnFunction.as = function (mixin) {

			return function(model) { 
				
				// user defined mixin
				mixin.call(this);
				
				_setupBinding(this, model);
			}			
		};
		
		return returnFunction;
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

	EventQueue : [],
		
	FireQueuedEvents : function() {
	
		while(Views.EventQueue.length > 0) {
		
			(Views.EventQueue.shift())();
		}
	},
	
	
	ViewType : function(body) {
		
		if(!iView.implements(body)) {
		
			throw "the body of the ViewType does not implement iView";
		}

		var _templater = new TemplaterFactory({ starttag : "<%", endtag : "%>"});

		
		return function(model) {		
			
			_queueDomBindings = function() {
			
					// when everything is rendered populate the references to the 
					// html dom elements, and do databind
					for(el in body.define) {
					
						if(body.define && body.define.hasOwnProperty(el)) {
						
							Views.EventQueue.push((function(el) {
								
								// curry up the functionality which will be run and attach things
								return function() {
								
									// run the curried definitions
									body[el] = body.define[el]();
									
									// bind them to change events
									if(body.dataBind && body.dataBind.hasOwnProperty(el)) {
									
										/*
										*  Bind.to('label').as(HtmlEntities.asPosition);
										*/
										body.dataBind[el].call(body[el], model);
									}
								}
								
							})(el));
						}
					}
			};
			
			_fireIfPresent = function(eventname, data) {
			
				if(body[eventname]) { body[eventname](body, data || model); }
			};
			
			_queueIfPresent = function(eventname, data) {
			
				if(body[eventname]) { 
				
					Views.EventQueue.push(function() {
						
						// we are passing the body as context - we could call() 
						// the event with the body as the context argument..
						body[eventname](body, data || model);
					});
				}
			};
			
			_queueDomBindings();
			
			_fireIfPresent('oncreate');
			
			this.render = function(parent) {
			
				_fireIfPresent('onrenderstart');
			
				_queueIfPresent('onload');
				
				var html = _templater.tmpl(body.template, model || {});
				
				_fireIfPresent('onrenderend');		
				
				if(parent) {
				
					parent.innerHTML += html;
					
					Views.FireQueuedEvents();
				} 
				
				return html;
			};
		
		};
	}
}


function Model(body) {

	var _events = [];

	var _notify = function(property) {	
	
		if(_events[property]) {
		
			for(var i=0; i<_events[property].length; i++) {
			
				_events[property][i](body[property]);			
			}
		}	
	};
	
	this.get = function(property) {
	
		return body[property];
	};
	
	this.set = function(property, value) {
	
		body[property] = value;
		
		_notify(property);
	};
	
	this.onchange = function(property, handler) {
	
		if(!_events[property]) {
		
			_events[property] = [];
		}
		
		_events[property].push(handler);
	};
}