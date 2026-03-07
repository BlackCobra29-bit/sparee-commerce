from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("App", "0018_remove_siteannouncement_is_active"),
    ]

    operations = [
        migrations.AddField(
            model_name="accountregistration",
            name="oem_authorization_certificate",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to="oem_authorization_certificates/",
            ),
        ),
    ]
