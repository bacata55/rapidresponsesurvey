const fs = require("fs");

class TwilioFlowTranslation {
  constructor(parentTemplatePath, prevVersion, version) {
      this.parentTemplatePath = parentTemplatePath,
      this.prevVersion = prevVersion,
      this.version = version,
      this.masterLang = "EN",
      this.languages = ["EN", "ES-US", "FR", "AR", "Farsi", "RU", "Swahili"]
  }

  async generateUpdatedTemplates(dictionaryPath, description, filePrefix, folderDestination) {
    try {
      await this.makeDirectory(folderDestination);
      // await this.createUpdatedDictionary();
      const languageTemplates = this.languages.map((language) => {
        return this.createNewTemplate(language, dictionaryPath, filePrefix, folderDestination);
      });

      await Promise.all(languageTemplates);
    } catch (error) {
      console.error("Something went wrong creates templates: ", error);
    }
  }

  async createUpdatedDictionary() {
    const template = await this.readFile(`master-template.json`);
    console.warn("template", Object.keys(template));
    // const masterDictionary = await this.readFile(`./master-dictionary.json`);
    let originalDictionary;
    if(this.prevVersion) {
      originalDictionary = await this.readFile(`${this.prevVersion}/template-dictionary-${this.prevVersion}.json`);
    } else {
      originalDictionary = await this.readFile(`./master-dictionary.json`);
    }
    const dictionary = { ...originalDictionary };
    template.states.forEach((state) => {
      if (!dictionary[state.name] && state.properties && state.properties.body) {
        console.log("Found new entry: ", state.name);
        const entry = this.createDictionaryEntry(state);
        if((state.name).includes("error")) {
          if(!dictionary.error) {
            dictionary.error = entry;
          }
        } else {
          dictionary[state.name] = entry;
        }
      }
    });

    const file = `./${this.version}/template-dictionary-${this.version}.json`
    return fs.writeFile(file, JSON.stringify(dictionary), (error) => {
      console.error(error);
      return error;
    });
  }

  async createNewDictionaryFromTemplate(title, filename, fileDestination) {
    // await this.makeDirectory();
    const template = await this.readFile(this.parentTemplatePath);
    const dictionary = {
      title,
      filename,
      version: this.version,
      date: new Date(),
    };

    template.states.forEach((state) => {
      if (!dictionary[state.name] && state.properties && state.properties.body) {
        const entry = this.createDictionaryEntry(state);
        if((state.name).includes("error")) {
          if(!dictionary.error) {
            dictionary.error = entry;
          }
        } else {
          dictionary[state.name] = entry;
        }
      }
    });

    return fs.writeFile(`${fileDestination}/${filename}-dictionary-1.0.json`, JSON.stringify(dictionary), (error) => {
      console.error(error);
      return error;
    });
  }

  async createNewTemplate(language, dictionaryPath, filePrefix, folderDestination) {
    const template = await this.readFile(this.parentTemplatePath);
    const translateTemplate = { ...template };
    const dictionary = await this.readFile(dictionaryPath);
    translateTemplate.states.forEach((state) => {
      if (state.properties && state.properties.body) {
        if(state.name.includes("error")) {
          state.properties.body = dictionary.error.dictionary[language].text;
        } else {
          const text = Object.values(dictionary[state.name].dictionary[language]).join("\n");
          state.properties.body = text;
        }
      }
    })
    const file = `${folderDestination}/${filePrefix}-flow-${language}.json`;
    return fs.writeFile(file, JSON.stringify(translateTemplate), (error) => {
      console.error("error trying to write", error);
      return error;
    });
  }

  async readFile(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (error, data) => {
        if (error) {
          console.error("Error reading in file: ", path);
          reject(error);
        }
        // console.log("states", JSON.parse(data).states[0]);
        resolve(JSON.parse(data));
      })
    })
  }

  async makeDirectory(directory) {
    return new Promise((resolve, reject) => {
      fs.mkdir(directory || this.version, (error) => {
        if (error) {
          console.error("Error making directory: ", directory);
          reject(error);
        }
        resolve();
      })
    })
  }

  createDictionaryEntry(templateState) {
    const dictionaryEntry = {
      type: templateState.type,
      dictionary: {},
    }

    const bodyParts = templateState.properties && templateState.properties.body.split("\n");

    // dictionaryEntry.dictionary[this.masterLang] = templateState.properties && templateState.properties.body;

    this.languages.forEach((language) => {
      dictionaryEntry.dictionary[language] = {};

      bodyParts.forEach((subString, i) => {
        if (i === 0) {
          if(language === this.masterLang) {
            dictionaryEntry.dictionary[language].text = subString
          } else {
            dictionaryEntry.dictionary[language].text = " "
          }
        } else {
          if (language === this.masterLang) {
            dictionaryEntry.dictionary[language][`option-${i}`] = subString;
          } else {
            dictionaryEntry.dictionary[language][`option-${i}`] = " ";
            // console.log(dictionaryEntry.dictionary[language]);
          }
        }
      });
    });

    return dictionaryEntry;
  }
}

module.exports = { TwilioFlowTranslation };

// Use the previous version and the current version
// const translation = new TemplateTranslation(null, "1.0");
// translation.generateUpdatedTemplates();
// translation.generateUpdatedTemplates();