/*

// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
(function(options){

  options = options || { starttag : "<%", endtag : "%>", name : "tmpl"};

  var cache = {};
 
  this[options.name] = function tmpl(str, data){
	// Figure out if we're getting a template, or if we need to
	// load the template - and be sure to cache the result.
	var fn = !/\W/.test(str) ?
	  cache[str] = cache[str] ||
		tmpl(document.getElementById(str).innerHTML) :
	 
	  // Generate a reusable function that will serve as a template
	  // generator (and which will be cached).
	  new Function("obj",
		"var p=[],print=function(){p.push.apply(p,arguments);};" +
	   
		// Introduce the data as local variables using with(){}
		"with(obj){p.push('" +
	   
		// Convert the template into pure JavaScript
		str
		  .replace(/[\r\t\n]/g, " ")
		  .split(options.starttag).join("\t")
		  .replace(new RegExp("((^|"+ options.starttag +")[^\t]*)'", "g"), "$1\r")
		  .replace(new RegExp("\t=(.*?)"+ options.endtag +"", "g"), "',$1,'")
		  .split("\t").join("');")
		  .split(options.endtag).join("p.push('")
		  .split("\r").join("\\'")
	  + "');}return p.join('');");
   
	// Provide some basic currying to the user
	return data ? fn( data ) : fn;
  };
})({ starttag : "<%", endtag : "%>", name : "tmpl2"});
*/

function TemplaterFactory(options) {

  options = options || { starttag : "<%", endtag : "%>"};

  var cache = {};
  
  return {
	
	tmpl : function(str, data) {
		// Figure out if we're getting a template, or if we need to
		// load the template - and be sure to cache the result.
		var fn = !/\W/.test(str) ?
		  cache[str] = cache[str] ||
			this.tmpl(document.getElementById(str).innerHTML) :
		 
		  // Generate a reusable function that will serve as a template
		  // generator (and which will be cached).
		  new Function("viewmodel",
			"var p=[],print=function(){p.push.apply(p,arguments);};" +
		   
			// Introduce the data as local variables using with(){}
			"with(viewmodel){p.push('" +
		   
			// Convert the template into pure JavaScript
			str
			  .replace(/[\r\t\n]/g, " ")
			  .split(options.starttag).join("\t")
			  .replace(new RegExp("((^|"+ options.starttag +")[^\t]*)'", "g"), "$1\r")
			  .replace(new RegExp("\t=(.*?)"+ options.endtag +"", "g"), "',$1,'")
			  .split("\t").join("');")
			  .split(options.endtag).join("p.push('")
			  .split("\r").join("\\'")
		  + "');}return p.join('');");
	   
		// Provide some basic currying to the user
		return data ? fn( data ) : fn;
	}
  };
}




