package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/sqs"
	"github.com/cbroglie/mustache"
	"github.com/ninjasphere/go-samsung-tv"
)

var commands = map[string]string{
	"power":       `<YAMAHA_AV cmd="PUT"><Main_Zone><Power_Control><Power>{{Value}}</Power></Power_Control></Main_Zone></YAMAHA_AV>`,
	"volume":      `<YAMAHA_AV cmd="PUT"><Main_Zone><Volume><Lvl><Val>{{Value}} {{Value2}} dB</Val><Exp></Exp><Unit></Unit></Lvl></Volume></Main_Zone></YAMAHA_AV>`, // <Val>Up 1 dB</Val>
	"volumeLevel": `<YAMAHA_AV cmd="PUT"><Main_Zone><Volume><Lvl><Val>{{Value}}</Val><Exp>1</Exp><Unit>dB</Unit></Lvl></Volume></Main_Zone></YAMAHA_AV>`,
	"mute":        `<YAMAHA_AV cmd="PUT"><Main_Zone><Volume><Mute>{{Value}}</Mute></Volume></Main_Zone></YAMAHA_AV>`,
	"input":       `<YAMAHA_AV cmd="PUT"><Main_Zone><Input><Input_Sel>{{Value}}</Input_Sel></Input></Main_Zone></YAMAHA_AV>`,
	"mode":        `<YAMAHA_AV cmd="PUT"><Main_Zone><Surround><Program_Sel><Current><Sound_Program>{{Value}}</Sound_Program></Current></Program_Sel></Surround></Main_Zone></YAMAHA_AV>`,
}

func main() {
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(os.Getenv("AWS_REGION")),
		Credentials: credentials.NewSharedCredentials(os.Getenv("AWS_SHARED_CREDENTIALS_FILE"), os.Getenv("AWS_PROFILE")),
	})

	if err != nil {
		fmt.Println("session error: : %v", err)
		return
	}

	_, err = sess.Config.Credentials.Get()
	if err != nil {
		sess, err = session.NewSession(&aws.Config{
			Region: aws.String(os.Getenv("AWS_REGION")),
		})

		if err != nil {
			fmt.Println("session error: : %v", err)
			return
		}
	}

	_, err = sess.Config.Credentials.Get()
	if err != nil {
		fmt.Println(`unable to establish aws credentials: %v`, err.Error())
		return
	}

	svc := sqs.New(sess)
	qURL := os.Getenv("AWS_SQS_URL")

	for {
		sqsRequest(svc, qURL)
	}
}

func sqsRequest(svc *sqs.SQS, qURL string) {
	result, err := svc.ReceiveMessage(&sqs.ReceiveMessageInput{
		AttributeNames: []*string{
			aws.String(sqs.MessageSystemAttributeNameSentTimestamp),
		},
		MessageAttributeNames: []*string{
			aws.String(sqs.QueueAttributeNameAll),
		},
		QueueUrl:            &qURL,
		MaxNumberOfMessages: aws.Int64(1),
		VisibilityTimeout:   aws.Int64(0),
		WaitTimeSeconds:     aws.Int64(20),
	})

	if err != nil {
		fmt.Println("sqs error: %v", err)
		return
	}

	if len(result.Messages) == 0 {
		fmt.Println("Received no messages")
		return
	}

	sendReciever(result)
	removeFromQueue(svc, qURL, result)
}

func removeFromQueue(svc *sqs.SQS, qURL string, result *sqs.ReceiveMessageOutput) {
	_, err := svc.DeleteMessage(&sqs.DeleteMessageInput{
		QueueUrl:      &qURL,
		ReceiptHandle: result.Messages[0].ReceiptHandle,
	})

	if err != nil {
		fmt.Println("delete error: %v", err)
		return
	}
}

func sendReciever(result *sqs.ReceiveMessageOutput) {
	type message struct {
		Action string
		Value  string
		Value2 int
	}
	var command message

	err := json.Unmarshal([]byte(*result.Messages[0].Body), &command)

	if err != nil {
		fmt.Println("json error: %v", err)
		return
	}

	if command.Action == "power" {
		if command.Value == "Standby" {
			// tvOff()
		}
	}

	data, err := mustache.Render(commands[command.Action], command)

	if err != nil {
		fmt.Println("mustache error: %v", err)
		return
	}

	req, err := http.NewRequest("POST", fmt.Sprintf(`%v/YamahaRemoteControl/ctrl`, os.Getenv("RECEIVER_IP")), bytes.NewBuffer([]byte(data)))
  req.Header.Add("Content-Type", "text/xml")
	client := &http.Client{}
	resp, err := client.Do(req)

	if err != nil {
		fmt.Println("receiver error: %v", err)
	}
	resp.Body.Close()
}

func tvOff() {
	tv := samsung.TV{
		Host:            os.Getenv("TV_IP"),
		ApplicationID:   "go-samsung-tv",
		ApplicationName: "Ninja Sphere         ", // XXX: Currently needs padding
	}

	err := tv.SendCommand("KEY_POWEROFF")
	if err != nil {
		fmt.Println("tv error: %v", err)
	}

}
