const chalk = require("chalk");
const { performance } = require("perf_hooks");
class ProfilingPlugin {
  apply(compiler) {
    // Compiler Hooks
    Object.keys(compiler.hooks).forEach(hookName => {
      compiler.hooks[hookName].intercept(makeInterceptorFor("Compiler")(hookName))
    });

    Object.keys(compiler.resolverFactory.hooks).forEach(hookName => {
      compiler.resolverFactory.hooks[hookName].intercept(makeInterceptorFor("Resolver")(hookName))
    });

    compiler.hooks.compilation.tap("ProfilingPlugin", (compilation, { normalModuleFactory, contextModuleFactory }) => {
      interceptAllHooksFor(compilation, "Compilation");
      interceptAllHooksFor(normalModuleFactory, "Normal Module Factory");
      interceptAllHooksFor(contextModuleFactory, "Context Module Factory");
      interceptAllParserHooks(normalModuleFactory);
      interceptTemplateInstancesFrom(compilation);
    });

    compiler.hooks.done.tap("ProfilingPlugin", () => {
      console.log((performance.getEntries().filter(t => t.entryType === 'measure').map(t => `${t.name}: ${t.duration}`)).join('\n'));
    })
  }
}

const interceptTemplateInstancesFrom = (compilation) => {
  const { mainTemplate, chunkTemplate, hotUpdateChunkTemplate, moduleTemplates } = compilation;

  const {
    javascript,
    webassembly
  } = moduleTemplates;

  [
    { instance: mainTemplate, name: "MainTemplate" },
    { instance: chunkTemplate, name: "ChunkTemplate" },
    { instance: hotUpdateChunkTemplate, name: "HotUpdateChunkTemplate" },
    { instance: javascript, name: "JavaScriptModuleTemplate" },
    { instance: webassembly, name: "WebAssemblyModuleTemplate" }
  ].forEach(templateObject => {
    Object.keys(templateObject.instance.hooks).forEach(hookName => {
      templateObject.instance.hooks[hookName].intercept(makeInterceptorFor(templateObject.name)(hookName));
    });
  });
};

const interceptAllHooksFor = (instance, logLabel) => {
  Object.keys(instance.hooks).forEach(hookName => {
    instance.hooks[hookName].intercept(makeInterceptorFor(logLabel)(hookName));
  })
};

const interceptAllParserHooks = (moduleFactory) => {
  const moduleTypes = [
    'javascript/auto',
    'javascript/esm',
    'json',
    'webassembly/experimental'
  ];

  moduleTypes.forEach(moduleType => {
    moduleFactory.hooks.parser.for(moduleType).tap("ProfilingPlugin", (parser, parserOpts) => {
      interceptAllHooksFor(parser, "Parser");
    })
  });
}

const instanceToFormat = (instanceString) => ({
  "Compiler": ["#F12D2D", 0],
  "Compilation": ["#FF9A3C", 1],
  "Resolver": ["#5AC8D8", 1],
  "Normal Module Factory": ["#FC5185", 1],
  "Context Module Factory": ["#FFDE25", 1],
  "MainTemplate": ["#EFE891", 2],
  "ChunkTemplate": ["#50E3C2", 2],
  "HotUpdateChunkTemplate": ["#D5FFFB", 2],
  "JavaScriptModuleTemplate": ["#239D60", 2],
  "WebAssemblyModuleTemplate": ["#D1F386", 2],
  "Parser": ["#00BBF0", 2],
  "default": ["#A3DE83", 0]
}[instanceString]);

const makeInterceptorFor = (instance) => (hookName) => ({
  register: ({ name, type, fn }) => {
    const newFn = makeNewProfiledTapFn(hookName, { name, type, fn });

    return ({ name, type, fn: newFn });
  },
  call: (...args) => {
    const instanceName = chalk`{bold ${instance}}`
    const hookNameFmt = chalk`{bold.underline ${hookName}}`
    const innerMessage = chalk`{bold Intercepting call from ${instance}: ${hookNameFmt} hook}`;
    const coloredMessage = chalk.hex(instanceToFormat(instance)[0])(innerMessage);

    console.log("".padStart(
      instanceToFormat(instance)[1] * 4
    ) + coloredMessage);
  }
});

const makeNewProfiledTapFn = (hookName, { name, type, fn }) => {
  const timingId = `${hookName}-${name}`;
  const perfMarkStartToken = (timingId) => `${timingId}-start`;
  const perfMarkStopToken = (timingId) => `${timingId}-stop`;

  switch (type) {
    case "promise":
      return (...args) => {
        console.time(timingId);
        performance.mark(perfMarkStartToken(timingId));
        return fn(...args).then(r => {
          console.timeEnd(timingId); return r;
          performance.mark(perfMarkStopToken(timingId));
          performance.measure(timingId, perfMarkStartToken(timingId), perfMarkStopToken(timingId));
        });
      };
    case "async":
      return (...args) => {
        console.time(chalk`{red timingId}`);
        performance.mark(perfMarkStartToken(timingId));
        const callback = args.pop();

        fn(...args, (...r) => {
          console.timeEnd(timingId);
          performance.mark(perfMarkStopToken(timingId));
          performance.measure(timingId, perfMarkStartToken(timingId), perfMarkStopToken(timingId));
          callback(...r);
        });
      };
    case "sync":
      return (...args) => {
        console.time(timingId);
        performance.mark(perfMarkStartToken(timingId));
        let r;
        try {
          r = fn(...args);
        } catch (error) {
          console.timeEnd(timingId);
          performance.mark(perfMarkStopToken(timingId));
          performance.measure(timingId, perfMarkStartToken(timingId), perfMarkStopToken(timingId));
          throw error;
        }
        console.timeEnd(timingId);
        performance.mark(perfMarkStopToken(timingId));
        performance.measure(timingId, perfMarkStartToken(timingId), perfMarkStopToken(timingId));
        return r;
      };
    default:
      break;
  }
};

module.exports = ProfilingPlugin;
