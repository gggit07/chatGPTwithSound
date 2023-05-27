import React, { useState, useEffect } from "react";
import API from "../api/api";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useSpeechSynthesis } from "react-speech-kit";
import { Container, Row, Col } from "react-bootstrap";

const OpenAI = () => {
  const [lng, setLng] = useState("tr-TR");
  const [message, setMessage] = useState("Informasiya is here!");
  const [clientTxt, setClientTxt] = useState("My text is here!");
  const [hasResult, setHasResult] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [voice, setVoice] = useState({});
  const [chatTxt, setChatTxt] = useState("Speaker text is here!");

  const [colSize, setColSize] = useState(12);
  const [colSizeCommands, setColSizeCommands] = useState(0);
  const [isShowCommands, setIsShowCommands] = useState(false);

  const commands = [
    {
      command: "Merhaba",
      callback: () => {
        setMessage(`Merhaba`);
      },
    },
    {
      command: "Selam",
      callback: () => {
        setMessage(`Aleykum Selam.`);
      },
    },
    {
      command: "temizle gitsin",
      callback: () => {
        setMessage(`Temizlendi.`);
        const tId = setTimeout(() => {
          setMessage("Informasiya is here!");
          clearTimeout(tId);
        }, 5000);
        setClientTxt("");
      },
    },
    {
      command: "gönder gitsin",
      callback: (command, spokenPhrase, similarityRatio) => {
        if (similarityRatio * 100 > 75) {
          setMessage("Mesajiniz gonderildi =)");
          const tId = setTimeout(() => {
            setMessage("Informasiya is here!");
            clearTimeout(tId);
          }, 5000);
          SpeechRecognition.stopListening();
          setClientTxt(
            clientTxt.slice(0, clientTxt.lastIndexOf(" gönder gitsin"))
          );
        }
      },
      isFuzzyMatch: true,
      fuzzyMatchingThreshold: 0.2,
    },
    {
      command: "send this message",
      callback: (command, spokenPhrase, similarityRatio) => {
        if (similarityRatio * 100 > 75) {
          setMessage("Your message sent =)");
          const tId = setTimeout(() => {
            setMessage("Informasiya is here!");
            clearTimeout(tId);
          }, 5000);
          SpeechRecognition.stopListening();
          setClientTxt(
            clientTxt.slice(0, clientTxt.lastIndexOf(" send this message"))
          );
        }
        setMessage(`Your message sent =)`);
        SpeechRecognition.stopListening();
      },
    },
    {
      command: "bitti",
      callback: () => {
        setMessage(`Tesekkurler`);
        SpeechRecognition.stopListening();
      },
    },
  ];

  const { resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition({
      clearTranscriptOnListen: true,
      commands: commands,
    });

  const startListening = () =>
    SpeechRecognition.startListening({ continuous: true, language: lng });
  const stopListening = () => SpeechRecognition.stopListening();

  const recognition = SpeechRecognition.getRecognition();

  const handleEnd = (e) => {
    console.log(e, "e");
    resetTranscript();
    setHasResult(false);
    setClientTxt("");
    startListening();
  };
  const { cancel, speak, voices } = useSpeechSynthesis({
    onEnd: handleEnd,
  });

  useEffect(() => {
    setVoice(voices.find((v) => v.lang === "tr-TR"));
  }, [voices]);

  recognition.addEventListener("result", function (event) {
    let resultStr = "";
    if (event.results.length > 1) {
      for (const key in event.results) {
        if (Object.hasOwnProperty.call(event.results, key)) {
          const r = event.results[key];
          if (
            compareStrings(r[0].transcript, "gönder gitsin") > 75 ||
            compareStrings(r[0].transcript, "send this message") > 75
          ) {
            resultStr = sliceText(resultStr, "gönder gitsin");
            if (resultStr.length > 0) setHasResult(true);
          } else if (
            +key === event.results.length - 1 &&
            (r[0].transcript.trim() === "temizle gitsin" ||
              r[0].transcript.trim() === "clear")
          ) {
            resetTranscript();
            resultStr = "";
          } else {
            resultStr += r[0].transcript;
          }
        }
      }
    } else {
      resultStr = event.results[0][0].transcript;
    }

    // if (resultStr.length > 0) setHasResult(true);

    setClientTxt(resultStr);
  });

  recognition.onstart = function () {
    console.log("onStart");
    setIsTalking(true);
  };

  recognition.onspeechend = function () {
    console.log("on speech end");
    setIsTalking(false);
    stopListening();
    if (hasResult) {
      setMessage("AI fetched DATA...");
      const fetchData = async () => {
        const { data } = await API.post(
          "/chat/completions",
          {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: clientTxt }],
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
            },
          }
        );
        console.log(data);
        if (data.choices[0].message.content) {
          const speakerText = data.choices[0].message.content;
          speak({ text: speakerText, voice: voice });
          printOut(speakerText, setChatTxt);
          setHasResult(false);
        }
      };

      fetchData();
    }
  };

  //   recognition.onnomatch = function () {
  //     console.log("on no match");
  //   };
  //   recognition.onsoundstart = function () {
  //     console.log("on sound start");
  //   };
  //   recognition.onaudiostart = function () {
  //     console.log("on audio start");
  //   };
  //   recognition.onspeechstart = function () {
  //     console.log("on speech start");
  //   };
  //   recognition.onaudioend = function () {
  //     console.log("on audio end");
  //   };
  //   recognition.onsoundend = function () {
  //     console.log("on sound end");
  //   };
  //   recognition.addEventListener("end", function (e) {
  //     console.log("on end");
  //   });
  //   recognition.addEventListener("error", function (e) {
  //     console.log("on error");
  //   });

  const hanleSelectChange = (e) => {
    setLng(e.target.value);
    setVoice(voices.find((v) => v.lang === e.target.value));
  };

  const handleTxtClient = (e) => {};

  const handleStopClick = () => {
    cancel();
    stopListening();
    setClientTxt("My text is here!");
    setChatTxt("Speaker text is here!");
    resetTranscript();
  };

  if (!browserSupportsSpeechRecognition) {
    return <h1>This browser not supported!</h1>;
  }

  const showCommandsList = () => {
    if (colSize === 12) {
      setColSizeCommands(3);
      setColSize(9);
      setIsShowCommands(true);
    } else {
      setColSizeCommands(0);
      setColSize(12);
      setIsShowCommands(false);
    }
  };

  return (
    <Container className="my-4">
      <div className="header">
        <button className="btn commands_list" onClick={showCommandsList}>
          Commands
        </button>
        <h1 className="text-center t-c-1 mb-4">GGG Voice Assistent</h1>
      </div>
      <Row>
        {isShowCommands && (
          <Col md={colSizeCommands}>
            <ul id="commands_list">
              {commands.map((c) => (
                <li key={c.command}>
                  <button className="btn btn-command">{c.command}</button>
                </li>
              ))}
            </ul>
          </Col>
        )}
        <Col md={colSize}>
          <div className="voice-assistent">
            <div className="info-wrapper wrapper-btn mb-2">
              <p className="info-situation">
                <span id="info-text">{message}</span>
                <span
                  id="info_icon"
                  className={isTalking ? "record" : ""}
                ></span>
              </p>
              <button
                className="btn btn-1"
                id="to-speak"
                onClick={startListening}
              >
                Click and start Speake
              </button>
            </div>
            <div className="box b-bc-1 mb-2">
              <textarea
                id="text-client"
                value={clientTxt}
                onChange={handleTxtClient}
              >
                {clientTxt}
              </textarea>
            </div>
            <div className="select-box">
              {Boolean(voice) && (
                <div className="select-div">
                  <select value={lng} onChange={hanleSelectChange}>
                    {voices.map((v) => (
                      <option
                        key={v.name}
                        value={v.lang}
                      >{`${v.name} (${v.lang})`}</option>
                    ))}
                  </select>
                </div>
              )}
              <button className="btn btn-danger" onClick={handleStopClick}>
                STOP
              </button>
            </div>
            <div className="box b-bc-2 mb-2">
              <p id="text-speaker">{chatTxt}</p>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default OpenAI;

function compareStrings(str1, str2) {
  // Convert to lowercase and tokenize each string
  const tokens1 = str1
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 0);
  const tokens2 = str2
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 0);

  // Define a set of stop words to remove
  const stopWords = new Set([
    "the",
    "and",
    "in",
    "of",
    "to",
    "a",
    "for",
    "is",
    "that",
    "with",
    "on",
    "at",
  ]);

  // Remove stop words from both lists
  const filteredTokens1 = tokens1.filter((word) => !stopWords.has(word));
  const filteredTokens2 = tokens2.filter((word) => !stopWords.has(word));

  // Calculate Jaccard similarity
  const intersection = new Set(
    filteredTokens1.filter((word) => filteredTokens2.includes(word))
  );
  const union = new Set([...filteredTokens1, ...filteredTokens2]);
  const jaccardSimilarity = intersection.size / union.size;

  // Multiply by 100 to get a percentage similarity score
  const percentSimilarity = jaccardSimilarity * 100;

  return percentSimilarity;
}

function sliceText(text, searchStr) {
  // Convert text to lowercase and split into words
  const words = text.toLowerCase().split(/\W+/);

  // Check if the last words include the search string
  const lastWords = words.slice(-searchStr.split(/\W+/).length);
  const includesSearchStr = lastWords.join(" ").includes(searchStr);

  if (includesSearchStr) {
    // If the last words include the search string,
    // slice the text to remove it
    const sliceIndex = text.toLowerCase().lastIndexOf(searchStr);
    return text.slice(0, sliceIndex);
  } else {
    // If the last words do not include the search string,
    // return the original text
    return text;
  }
}

function printOut(text, setTxt) {
  setTxt("");
  let txt = "";
  var index = 0;

  var printNextLetter = function () {
    if (index < text.length) {
      var CHAR = text[index];

      txt += CHAR;
      setTxt(txt);

      index++;

      setTimeout(printNextLetter, Math.ceil(Math.random() * 100));
    }
  };

  printNextLetter();
}
